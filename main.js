const Discord = require("discord.js"); //discord api 
const fs = require("fs"); //file system library
const config = JSON.parse(fs.readFileSync("./config.json")); //loads config file and access it with config const

const client = new Discord.Client();
const prefix = config.prefix;
var lastUserCount = 0; //keeps track of number of users in the audio channel (so it only notifies people when users goes from 0 -> 1)

//opens config file so that it can have data saved to it
function saveData(data)
{
    try
    {
        fs.writeFileSync("./botTestingConfig.json",JSON.stringify(data))
    }
    catch(error)
    {
        console.error(error);
    }
}


client.once("ready", () => {
    console.log("online")
})

//triggers when someone sends a message
client.on('message', (message) => {
    if (!message.content.startsWith("!") || message.author.bot) return; //if it shouldn't be processed then return and ignore it

    //console.log(message.channel);
    message.channel.send("response");
  });

//triggers when someone leaves/joins a channel (also triggers when someone mutes/unmutes)
client.on("voiceStateUpdate", () => {
    var botChannel = client.channels.cache.get(config.botChannel); 
    var voiceChannel = client.channels.cache.get(config.voiceChannel); 

    var userCount = voiceChannel.members.size;
    console.log("last userCount"+ lastUserCount);
    console.log("userCount: "+userCount);

    if(userCount!== 0 && lastUserCount === 0) //if there is not zero people in the channel and there were previously zero people
    {
        botChannel.send("@everyone come join us");
    }

    lastUserCount = userCount;
    console.log("updated last userCount: "+lastUserCount);
    //botChannel.send("someone has joined a voice chat");

})

  //var v = new Discord.VoiceChannel(); v.em

//returns token stored in text file
function readTextFile(location)
{
    var fileRequest = new XMLHttpRequest();
    fileRequest.open("GET","file:///"+location,false);
    fileRequest.onload = function()
    {
        return fileRequest.responseText;
    }
}
//console.log(readTextFile("D:\\programming\\javascript\\discord bot\\token.txt"))

client.login(config.token);