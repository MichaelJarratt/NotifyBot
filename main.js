const Discord = require("discord.js"); //discord api 
const client = new Discord.Client(); //the "client" is how the bot interacts with the discord server, for example wiritng a message in a text channel
const fs = require("fs"); //file system library
const configFile = "./botTestingConfig.json"
const config = JSON.parse(fs.readFileSync(configFile)); //loads config file and access it with config const
const prefix = config.prefix; //the prefix is the letter a message must begin with for the bot to read it
var lastUserCount = 0; //keeps track of number of users in the audio channel (so it only notifies people when users goes from 0 -> 1)
/*console.log(config);
let optedIn = config.optedIn;
optedIn[0] = "mike";
console.log(config);
saveConfig(); */


//saves changed JSON data to configuration file (definied on line 3)
function saveConfig()
{
    try
    {
        let buffer = JSON.stringify(config,null,2); //converts the JSON onbect to the string notation
        fs.writeFileSync(configFile,buffer);
    }
    catch(error)
    {
        console.error(error);
    }
}
//triggers only once, when the bot is connected to the discord server and is "ready"
client.once("ready", () => {
    console.log("online")
})

//triggers when someone sends a message
client.on('message', (message) => {
    //starts trying to interpret message is it begins with [prefix] and if the messages author was not a bot
    if (message.content.startsWith(config.prefix) && !message.author.bot)
    {
        //console.log(message.channel);
        message.channel.send("response");
    }
  });

//triggers when someone leaves/joins a channel (also triggers when someone mutes/unmutes)
client.on("voiceStateUpdate", () => {
    var botChannel = client.channels.cache.get(config.botChannel); //channel that bot will send notifications in
    var voiceChannel = client.channels.cache.get(config.voiceChannel); //voice channel that bot monitors

    var userCount = voiceChannel.members.size; //number of people in the voice channel
    console.log("last userCount"+ lastUserCount);
    console.log("userCount: "+userCount);

    //if the number of people in the channel has gone from 0 to >0
    if(userCount!== 0 && lastUserCount === 0)
    {
        botChannel.send("@everyone come join us");
    }

    lastUserCount = userCount;
    console.log("updated last userCount: "+lastUserCount);

})

//code before this point is configuring the bot, line below is where is actually connects to the server and starts listening
client.login(config.token);