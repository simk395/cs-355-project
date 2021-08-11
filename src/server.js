const http = require('http');
const fs = require('fs');
const port = 8080;
const app = http.createServer();

const path = {
    image: "../images",
    css: "../css"
};

const mime_type = {
    html: 'text/html',
    image: 'image/x-icon',
    css: 'text/css'
};

app.on("request", connection_handler);
function connection_handler(req, res){
    if(req.url === "/"){
        const index = fs.createReadStream("../index.html");
        res.writeHead(200, {'Content-Type': mime_type.html});
        index.pipe(res);
    }

    else if(req.url === "/favicon.ico"){
        const icon = fs.createReadStream(path.image + "/favicon.ico");
        res.writeHead(200, {'Content-Type':mime_type.image});
        icon.pipe(res);
    }
    
    else if(req.url.endsWith(".css")){
        const style = fs.createReadStream(path.css + req.url);
        res.writeHead(200, {'Content-Type': mime_type.css});
        style.pipe(res);

    }

    else if(req.url.startsWith("/search")){
        console.log("hello world");
    }

    else if(req.url.startsWith("/auth")){

        function stream_to_message(stream, callback){
            let body = '';
            stream.on("data", chunk => body += chunk);
            stream.on("end", () => callback(body));
        }

        const auth_code = new URL("http://localhost:8080" + req.url).searchParams.get('code');
        const token_endpoint = "https://api.aniapi.com/v1/oauth/token";
        const client_id = "390d51ed-0574-4f43-8ac1-988b8751825b";
        const client_secret = "3ee6747f-7369-4ce8-9b31-15ddfb312bdd";
        const url = token_endpoint + "response_code=code&client_id=" + client_id + "&client_secret=" + client_secret;

        const auth_req = https.request(url);
        const auth_sent_time = new Date();
        auth_req.on('error', error_handler);
        function error_handler(err){
            throw err;
        } 

        auth_req.connection_handler("response", post_auth_cb);
        function post_auth_cb(incoming_msg_stream){
            stream_to_message(incoming_msg_stream, message => console.log(message))
        }

        auth_req.end(post_data);
    }
    
    else{
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
