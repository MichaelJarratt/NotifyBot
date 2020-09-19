const Discord = require("discord.js"); //discord api 
const client = new Discord.Client(); //the "client" is how the bot interacts with the discord server, for example wiritng a message in a text channel
const fs = require("fs"); //file system library
const configFile = "./botTestingConfig.json"
const config = JSON.parse(fs.readFileSync(configFile)); //loads config file and access it with config const
const prefix = config.prefix; //the prefix is the letter a message must begin with for the bot to read it
var lastUserCount = 0; //keeps track of number of users in the audio channel (so it only notifies people when users goes from 0 -> 1)
var botChannel = null;
var voiceChannel = null;

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
    console.log("online");
    //these must be defined once the bot has connected to the server
    botChannel = client.channels.cache.get(config.botChannel); //channel that bot will send notifications in
    voiceChannel = client.channels.cache.get(config.voiceChannel); //voice channel that bot monitors
})

//triggers when someone leaves/joins a channel (also triggers when someone mutes/unmutes)
client.on("voiceStateUpdate", () => {
    //var botChannel = client.channels.cache.get(config.botChannel); //channel that bot will send notifications in
    //var voiceChannel = client.channels.cache.get(config.voiceChannel); //voice channel that bot monitors

    console.log(botChannel);
    console.log(voiceChannel);

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

//triggers when someone sends a message
client.on('message', (message) => {
    //starts trying to interpret message is it begins with [prefix] and if the messages author was not a bot
    if (message.content.startsWith(config.prefix) && !message.author.bot)
    {
        let command = message.content.substring(1); //removes [prefix] from command
        //console.log(command);
        
        switch(command)
        {
            case "help":
                commandHelp();
                break;
            case "opt-in":
                commandOptIn(message.author);
                break;
            case "opt-out":
                commandOptOut(message.author);
                break;
            default:
                commandUnknown();
        }
    }
  });

//############ defining recognised commands #######################
function commandHelp()
{
    let message = "Hello, my purpose is to notify people with an @[username] when a voice channel becomes active.\n"
                 +`This is an opt-in service, if you wish to be notifed then type ${config.prefix}opt-in into this chat.\n`
                 +"Valid  commands:\n"
                 +`${config.prefix}opt-in\n`
                 +`${config.prefix}opt-out`;
    botChannel.send(message);
}

//adds user who sent the command to the opted-in list
function commandOptIn(author)
{
    //console.log(author);
    let username = author.username; //gets username of the auther who asked to opt-in
    if(!config.optedIn.includes(username)) //if the username does not already appear in the opted in array
    {
        config.optedIn.push(username); //adds it to the config object
        saveConfig(); //saves it to file
        botChannel.send(`${username}, you have been opted in.`);
    }
    else //user is already in the list
    {
        botChannel.send(`${username}, you are already opted in`);
    }

}

//removes user who send the command from the opted-in list
function commandOptOut(author)
{
    let username = author.username //gets the username of the auther who asked to opt-out
    let position = config.optedIn.indexOf(username);
    if(position != -1) //if user is in the list
    {
        config.optedIn.splice(position,1); //removes element at [positon] (name of user opting out)
        saveConfig();
        botChannel.send(`${username}, you have been opted out`);
    }
    else //if user is not in the list
    {
        botChannel.send(`${username}, you were not opted in.`);
    }
    console.log(config);
}

//for when typed command is not recognised
function commandUnknown()
{
    botChannel.send("I don't recognise that command.\nTry \"!help\" for valid commands ");
}
//############ end defining recognised commands ###################

//code before this point is configuring the bot, line below is where is actually connects to the server and starts listening
client.login(config.token);