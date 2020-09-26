/*  This file servers no purpose for bot function.
*   It opens an express webserver so that the bot will be kept alive on reple.it as outlined in the link below
*/  https://repl.it/talk/learn/Hosting-discordjs-bots-on-replit-Works-for-both-discordjs-and-Eris/11027

const express = require('express');
const server = express();
server.all("/", (request,response) => {
  response.send("Bot Response")
})
function keepAlive()
{
  server.listen(3000,() => {console.log("server is ready")})
}
module.exports = keepAlive;