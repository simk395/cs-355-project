function generate_card(anime){
    let genres = '';
    for(let i = 0; i < 4; i++){
        if(!anime.genres[i]) break;
        i < 3 ? genres = genres + anime.genres[i] + ", ": genres = genres + anime.genres[i];
    }
    let card = `<div class="card">`
        img = `<img src=${anime.cover_image}>`
        details = `<div class="card-details">`
        title = `<p class="card-title">${anime.titles.en}</p>`
        score = `<p class="card-score">Score: ${anime.score}</p>`
        genre = `<p class="card-genre">Genre: ${genres}</p>`
        close_div = `</div>`

    if(anime.score === 0){
        score = `<p class="card-score">Score: N/A</p>`
    }
    return card + img + details + title + score + genre + close_div + close_div;
}

function generate_rows(cards){
    let rows = [];
    let count = 0;
    let elements = "";
    cards.forEach(card => {
        if(count === 0){
            elements = `<div class="row">`;
        }

        elements += card;
        count++;

        if(count === 3){
            elements += "</div>";
            rows.push(elements);
            count = 0;
        }
    })

    return rows;
}

function generate_quotes(quotes){
    if(quotes.error){
        return ""
    }
    let head = "<h1>Quotes</h1><div>"
    let tail = "</div>"
    quotes.forEach( (quote, i) => {
        if(i >= 5) return;
        let char_quote = quote.quote.replace("\n", "<br>");
        let h2 = `<h2 class="quote">${char_quote}<br>- ${quote.character}</h2><br>`;
        head += h2;
    })

    return head + tail;
}

function generate_webpage(animes, quotes){
    animes = animes.filter(anime => !anime.genres.includes("Hentai"));
    let cards = animes.map(anime => generate_card(anime));
    let rows = generate_rows(cards);
    let quotes_container = generate_quotes(quotes);
    let html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="reset.css">
        <link rel="stylesheet" href="style.css">
        <title>Anime Buddy</title>
    </head>
    <body>
        <nav>
            <div id="logo">
                <p>anime buddy</p>
            </div>
            <div id="search">
                <form action="search" method="get">
                    <input 
                        type="text" 
                        id="searchbar" 
                        name="q" 
                        aria-label="Search for anime info"
                        placeholder="Search for anime info"
                    >
                    <button type="Submit">Submit</button>
                </form>
            </div>
        </nav>
        <main>
            <div class="container">  
                <h1>Search Result</h1>           
`    
rows.forEach(row => html += row);

let html_tail =  ` 
            </div>
        </main>
    </body>
    </html>`

    return html + quotes_container + html_tail;
}

module.exports = generate_webpage;

// <h1>Quotes from this Anime</h1>
// <div>
//     <h2>"Because of the existence of love - sacrifice is born. As well as hate. Then one comprehends... one knows PAIN." - Pain</h2>
//     <br>
//     <h2>"Physical wounds will definitely bleed and may look painful <br>but over time they heal by themselves and if you apply medicine, <br>they will heal faster. What's troublesome are wounds of the heart. Nothing is harder to heal. They're a bit different from physical injuries. You can't apply medicine for one thing and sometimes, they never heal. There's only one cure for a wound of the heart. \nIt's a bit bothersome and you can only receive it from someone else. What is it? Love." - Yashamaru</h2>
// </div>