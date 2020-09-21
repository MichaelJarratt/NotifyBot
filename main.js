const Discord = require("discord.js"); //discord api 
const { ADDRGETNETWORKPARAMS } = require("dns");
const client = new Discord.Client(); //the "client" is how the bot interacts with the discord server, for example wiritng a message in a text channel
const fs = require("fs"); //file system library
const configFolder = "./config files/";
const defaultConfigFile = configFolder+"default-config.json"
var config = JSON.parse(fs.readFileSync(defaultConfigFile)); //loads config file and access it with config const

var prefix = config.prefix; //the prefix is the letter a message must begin with for the bot to read it
//var lastUserCount = 0; //keeps track of number of users in the audio channel (so it only notifies people when users goes from 0 -> 1)
var lastUserCountMap = new Map();
var currentGuild = null;
var botChannel = null;
var voiceChannel = null;

/*console.log(config);
let optedIn = config.optedIn;
optedIn[0] = "mike";
console.log(config);
saveConfig(); */

//
function loadServerConfig(event)
{
    let guildID = event.guild.id; //gets ID of guild the event was from
    if(guildID !== currentGuild) //if the current guildID is not correct for processing this event
    {
        currentGuild = guildID;
        if(fs.existsSync(`${configFolder}${currentGuild}.json`)) //config file for the server already exists
        {
            config = JSON.parse(fs.readFileSync(`${configFolder}${currentGuild}.json`)); //loads config for that server
        }
        else //server does not have a config file
        {
            config = JSON.parse(fs.readFileSync(`${configFolder}default-config.json`)); //does not have bot/voice channels defined
        }
        //update settings
        prefix = config.prefix;
        botChannel = client.channels.cache.get(config.botChannel);
        voiceChannel = client.channels.cache.get(config.voiceChannel);
    }
    //console.log(guildID);
}

//saves changed JSON data to configuration file (definied on line 3)
function saveConfig()
{
    try
    {
        let buffer = JSON.stringify(config,null,2); //converts the JSON onbect to the string notation
        fs.writeFileSync(configFolder+currentGuild+".json",buffer); //writes to config file for current server
    }
    catch(error)
    {
        console.error(error);
    }
}
//triggers only once, when the bot is connected to the discord server and is "ready"
client.once("ready", (event) => {
    console.log("online");
    let guildIDs = Array.from(client.guilds.cache.keys()); //gets guild ID for each guild bot is in
    guildIDs.forEach(function(guildID) //for every guild the bot is a part of
    {
        lastUserCountMap.set(guildID,0); //initiates the number of people in each voice channel as zero (if wrong will be corrected after first person joins/leaves)
    })
    console.log(config.botChannel);
})

//triggers when someone leaves/joins a channel (also triggers when someone mutes/unmutes)
client.on("voiceStateUpdate", (event) => {
    //console.log(botChannel);
    //console.log(voiceChannel);
    loadServerConfig(event); //passes event so that the server ID can be discovered and used to load the correct config file
    if(config.voiceChannel !== "") //if the voice-channel is not configured then the member count can't be processed
    {
        let members = voiceChannel.members; //members is a Map with info on users in the channel, the maps key is the user IDs
        var userCount = voiceChannel.members.size; //number of people in the voice channel
        //console.log("last userCount"+ lastUserCount);
        //console.log("userCount: "+userCount);
        //console.log(Array.from(members.keys()));

        //if the number of people in the channel has gone from 0 to >0
        if((userCount!== 0 && lastUserCountMap.get(currentGuild) === 0) && config.botChannel !== "") //if the bot-channel is not set up then no notification can be sent, however the number of members in the voice-channal can still be updated
        {
            let inChannel = Array.from(members.keys()); //gets userIDs of all users in the voiceChannel (typically just one, but redundency is important)
            let buffer = "";
            config.optedIn.forEach(function(userID)
                {
                    if(!inChannel.includes(userID)) //if this user is not already in the channel
                    {
                        buffer += `<@${userID}>, `; //notify them
                    }
                })
            //console.log(buffer);
            if(buffer !== "") //if the only person who is opted in is the person who joined the channel (fringe case)
            {
                buffer += "come join us.";
                botChannel.send(buffer);
            }
            //botChannel.send("<@395934915658776578>");
        }

        lastUserCountMap.set(currentGuild,userCount); // = userCount;
        //console.log("updated last userCount: "+lastUserCount);
    }
})

//triggers when someone sends a message
client.on('message', (message) => {
    loadServerConfig(message); //passes event so that the server ID can be discovered and used to load the correct config file

    //starts trying to interpret message is it begins with [prefix] and if the messages author was not a bot
    if (message.content.startsWith(config.prefix) && !message.author.bot)
    {
        let command = message.content.substring(1); //removes [prefix] from command
        command = command.toLowerCase();
        let args = command.split(" "); //splits line into command+arguments, for commands that need arguments
        command = args.shift(); //removes command and puts it into command variable, any arguments will be left in args
        //console.log(command);

        if(command === "set-bot-channel") //outside of switch because this is the only command that can be done before having a bot channel
        {
            commandSetBotChannel(args[0]); //passes the second item in args (the argument)
        }
        else if(config.botChannel !== "") //if the bot channel has been configured
        {
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
                case "set-prefix":
                    commandSetPrefix(args[0]);
                    break;
                case "set-voice-channel":
                    commandSetVoiceChannel(args[0]);
                    break;
                default:
                    commandUnknown();
            }
        }
    }
  });

// executes when bot joins a server, prompts users to configure it
client.on("guildCreate",function(guild)
{
    //console.log(guild);
    //console.log(guild.channels);
    //let map = new Map(); 
    currentGuild = guild.id;
    let channel = getDefaultChannel(); //will hold ID of first text channel
    
    let buffer = "Thank you for inviting me to the server!\n"
                +"Before we can begin, I need to be configured. The default prefix for my commads is \"!\"\n"
                +"Thing #1: I need a channel to type to, give me the ID of your bot-channel using \"!set-bot-channel [channel ID]\"\n"
                +"thing #2: I need a voice channel to monitor, give me the ID of this channel using \"!set-voice-channel [channel ID]\"\n"
                +"Once these are done, you can use \"!help\" to find out about my other commands";
    channel.send(buffer);
})

//will find and return the first text channel for this guild
function getDefaultChannel()
{
    guild = client.guilds.cache.get(currentGuild); //gets guild object via guildID    
    let found = false; //used because break statement cannot be used in a foreach
    guild.channels.cache.forEach(function(channelCheck) //iterates over each channel
    {
        if(channelCheck.type === "text" && !found) //will find the first text channel then set the found flag
        {
            channel = channelCheck;
            found = true;
        }
    })
    return channel;
}

//############ defining recognised commands #######################
function commandHelp()
{
    let message = "Hello, my purpose is to notify people with an @[username] when a voice channel becomes active.\n"
                 +`This is an opt-in service, if you wish to be notifed then type "${config.prefix}opt-in" into this chat.\n`
                 +"Valid  commands:\n"
                 +`${config.prefix}opt-in\n`
                 +`${config.prefix}opt-out\n`
                 +`${config.prefix}set-bot-channel [channel ID]    -what channel I message in\n`
                 +`${config.prefix}set-voice-channel [channel ID] -what voice channel I notify you about\n`
                 +`${config.prefix}set-prefix [character]             -what character you use beofre sending me a command`;
    botChannel.send(message);
}

//sets the bot channel according to the input, then saves the config
function commandSetBotChannel(channelID)
{
    config.botChannel = channelID;
    botChannel = client.channels.cache.get(config.botChannel);
    //console.log(botChannel);
    if(botChannel !== null && botChannel !== undefined)
    {
        botChannel.send("This is now my channel.")
    }
    else //could not get channel from ID, message default channel
    {
        config.botChannel = ""; //do not save invalid ID, set the id as empty
        let defaultChannel = getDefaultChannel();
        //console.log(defaultChannel);
        defaultChannel.send("Something went wrong, make sure you give me the ID for the bot-channel, not the name.")
    }
    saveConfig();
}

//sets the voice channel according to the input, then saves the config
function commandSetVoiceChannel(channelID)
{
    config.voiceChannel = channelID;
    voiceChannel = client.channels.cache.get(config.voiceChannel);
    if(voiceChannel !== null && voiceChannel !== undefined) //if the voiceChannel is valid
    {
        botChannel.send(`Now monitoring ${voiceChannel.name}.`);
    }
    else //if [channelID] did not correspond to a valid channel
    {
        config.voiceChannel = ""; //do not save invalid ID, set the id as empty
        botChannel.send("Something went wrong, make sure you give me the ID for the voice-channel, not the name.")
    }
    saveConfig();
}

//sets the command prefix according to the input, then saves the config
function commandSetPrefix(newPrefix)
{
    config.prefix = newPrefix.charAt(0); //if multiple characters are entered only the first will be used
    saveConfig();
    prefix = config.prefix;
    botChannel.send(`Now using "${prefix}" as the new prefix.`)
}

//adds user who sent the command to the opted-in list
function commandOptIn(author)
{
    //console.log(author);
    let username = author.username; //gets username of the auther who asked to opt-in
    let userID = author.id; //gets the ID of the user (this is what's used for tagging)
    if(!config.optedIn.includes(userID)) //if the username does not already appear in the opted in array
    {
        config.optedIn.push(userID); //adds it to the config object
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
    let userID = author.id; //gets the ID of the user (this is what's used for tagging)
    let position = config.optedIn.indexOf(userID);
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
}

//for when typed command is not recognised
function commandUnknown()
{
    botChannel.send("I don't recognise that command.\nTry \"!help\" for valid commands ");
}
//############ end defining recognised commands ###################

//code before this point is configuring the bot, line below is where is actually connects to the server and starts listening
client.login(config.token);