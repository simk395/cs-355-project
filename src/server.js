const http = require('http');
const https = require('https');
const fs = require('fs');
const generate_webpage = require('./webpage.js');
const port = 8080;
const app = http.createServer();

const path = {
    image: "../images",
    css: "../css",
    cache: "./cache/authentication.json"
};

const mime_type = {
    html: 'text/html',
    image: 'image/x-icon',
    css: 'text/css',
    js: 'application/javascript'
};

// write cache file with JSON response from AniApi
function create_access_token_cache(aniapi_auth){
    fs.writeFile("./cache/authentication.json", aniapi_auth, (err) => {
        if (err){
            throw err;
        }
    })
}

// handle server requests
app.on("request", connection_handler);
function connection_handler(req, res){

    // concat chunks being transmitted then return it as a whole
    function stream_to_message(stream, callback){
        let body = '';
        stream.on("data", chunk => body += chunk);
        stream.on("end", () => callback(body));
    }

    // send client to AniApi auth page
    function send_to_auth(){
        const url = "https://api.aniapi.com/v1/oauth?response_type=code&client_id=59d7f5ac-d9e7-43e3-af84-bd7c0194411b&redirect_uri=http://localhost:8080/auth"
        res.writeHead(302, {"Location": url})
        res.end();
    }

    // home
    if(req.url === "/"){
        const ani_api_options = {
            method: "GET"
        }

        // Line 55 - 60: get current season and year
        let date = new Date();
        let month = date.getMonth();
        let year = date.getFullYear();
        let seasons = ["Winter", "Spring", "Summer", "Fall"];
        let quarter = Math.floor(month/3);
        let season = seasons[quarter];

        // request to AniApi with query parameters year and season
        const ani_api = `https://api.aniapi.com/v1/anime?year=${year}&season=${season}`;
        const search_request = https.request(ani_api, ani_api_options);

        // Line 66 - 76: parse the anime info from the AniApi response and then request for animechan
        search_request.once("response", search_request_stream_message => {
            stream_to_message(search_request_stream_message, search_request_message => {
                let ani_api_response = JSON.parse(search_request_message);
                if(ani_api_response.status_code === 200){
                    const ani_api_data = ani_api_response.data.documents.sort( (first, second) => first.mal_id - second.mal_id );
                    const animechan = 'https://animechan.vercel.app/api/quotes';
                    const animechan_options = {
                        method: "GET"
                    }
                    
                    // parse quotes data from animechan and then generate a webpage to be sent to the client
                    const search_quotes = https.request(animechan, animechan_options);
                    search_quotes.once("response", search_quotes_stream_message => {
                        stream_to_message(search_quotes_stream_message, search_quotes_message => {
                            const animechan_data = JSON.parse(search_quotes_message);
                            res.writeHead(200, {'Content-Type': mime_type.html})
                            res.end( generate_webpage(ani_api_data, animechan_data) );
                        })
                    })
                    search_quotes.end();
                }else{
                    // if it didnt work then just send them a homepage without any animes rendered
                    const index = fs.createReadStream("../index.html");
                    res.writeHead(200, {'Content-Type': mime_type.html});
                    index.end(res);
                }
            })
        })
        search_request.end();
    }

    // tab icon
    else if(req.url === "/favicon.ico"){
        const icon = fs.createReadStream(path.image + "/favicon.ico");
        res.writeHead(200, {'Content-Type':mime_type.image});
        icon.pipe(res);
    }
    
    // css request
    else if(req.url.endsWith(".css")){
        const style = fs.createReadStream(path.css + req.url);
        res.writeHead(200, {'Content-Type': mime_type.css});
        style.pipe(res);
    }

    // search
    else if(req.url.startsWith("/search")){
        // save what the client is searching for
        const search_title = new URL("http://localhost:8080" + req.url)
            .search
            .slice(3)
            .replace("+", "%20");

        // check for a authentication cache file
        fs.readFile(path.cache, 'utf8', (err, data) => {
            // if there is not authentication data then redirect to auth page
            if(err){
                send_to_auth();
                return;
            }

            // if auth is successful make request to AniApi search endpoint
            let auth = JSON.parse(data);
            if(auth.status_code === 200){
                const ani_api_options = {
                    method: "GET",
                    headers:{
                        Authorization: "Bearer " + auth.data
                    }
                }

                // Use search from client as a query paramenter for title
                const ani_api = 'https://api.aniapi.com/v1/anime?title=' + search_title;
                const search_request = https.request(ani_api, ani_api_options);

                // parse AniApi response data (anime info). Sort the data to oldest to newest then save the first one
                search_request.once("response", search_request_stream_message => {
                    stream_to_message(search_request_stream_message, search_request_message => {
                        let ani_api_response = JSON.parse(search_request_message);
                        // check if aniapi request was a success, if it is then send the second request
                        if(ani_api_response.status_code === 200){
                            const ani_api_data = ani_api_response.data.documents.sort( (first, second) => first.mal_id - second.mal_id );
                            let title = ani_api_data[0].titles.en;
                            
                            // use title from first anime as query parameter for anime to get quotes from
                            const animechan = 'https://animechan.vercel.app/api/quotes/anime?title=' + title;
                            const animechan_options = {
                                method: "GET"
                            }
                            
                            const search_quotes = https.request(animechan, animechan_options);
                            search_quotes.once("response", search_quotes_stream_message => {
                                stream_to_message(search_quotes_stream_message, search_quotes_message => {
                                    // parse the data regardless of status code
                                    const animechan_data = JSON.parse(search_quotes_message);
                                    res.writeHead(200, {'Content-Type': mime_type.html})
                                    // send in html, html will handle quotes error checking
                                    res.end( generate_webpage(ani_api_data, animechan_data) );
                                })
                            })
                            search_quotes.end();
                    }
                    else if( ani_api_response.status_code === 401){
                        send_to_auth();
                    }
                    else{
                        // send them a no results found page if aniapi doesnt find anything
                        const no_results = fs.createReadStream("../search.html");
                        res.writeHead(200, {'Content-Type': mime_type.html});
                        no_results.pipe(res);
                    }
                })
            })
            search_request.end();

            }else{
                // if not authorized then send them to auth page
                send_to_auth();
            }
        })
    }

    // authentication
    else if(req.url.startsWith("/auth")){
        // things that should be in an environment variable
        const auth_code = new URL("http://localhost:8080" + req.url).searchParams.get('code');
        const token_endpoint = "https://api.aniapi.com/v1/oauth/token";
        const client_id = "59d7f5ac-d9e7-43e3-af84-bd7c0194411b";
        const client_secret = "3ee6747f-7369-4ce8-9b31-15ddfb312bdd";
        const url = token_endpoint + "?code=" + auth_code + "&client_id=" + client_id + "&client_secret=" + client_secret + "&redirect_uri=http://localhost:8080/auth" ;

        const options = {
            method: "POST"
        }

        const auth_req = https.request(url, options);
        auth_req.on('error', err => {
            throw err;
        });

        auth_req.once("response", auth_req_message => {
            stream_to_message(auth_req_message, message => {
                create_access_token_cache(message);
                res.writeHead(302, {'Location': "/"});
                res.end();
            })
        });

        auth_req.end();
    }
    
    else{
        // if url doesnt exist then send them to a 404 page
        const file_not_found = fs.createReadStream("../404.html");
        res.writeHead(404, {'Content-Type': mime_type.html});
        file_not_found.pipe(res);
    }


	console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
}

app.on("listening", listening_handler);
function listening_handler(){
	console.log(`Now Listening on Port ${port}`);
}

app.listen(port);
