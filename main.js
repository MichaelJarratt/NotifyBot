const Discord = require("discord.js"); //discord api 
//const { ADDRGETNETWORKPARAMS } = require("dns");
const client = new Discord.Client(); //the "client" is how the bot interacts with the discord server, for example wiritng a message in a text channel
const fs = require("fs"); //file system library
const configFolder = "./config files/";
const defaultConfigFile = configFolder+"default-config.json"
var config = JSON.parse(fs.readFileSync(defaultConfigFile)); //loads config file and access it with config const

//config.prefix is the symbol which must prefix any command for the bot to try to interpret it
var lastUserCountMap = new Map(); //keeps track of number of users in the audio channel for each server (so it only notifies people when users goes from 0 -> 1)
var currentGuild = null;    //ID of current server
var botChannel = null;      //object representing text channel to send messaged to
var voiceChannel = null;    //object representing voice channel to monitor

/*
*   When an event occurs (message or VoiceStateUpdate) the bot needs to know the configuration for the server the event originated from
*   in order to respond correctly.
*   @param event -event holds a reference to the server it was generated by
*   Function will load the config file for the server (or default if it does not have one) and update the relevent variables
*/
function loadServerConfig(event)
{
    let guildID = event.guild.id; //gets ID of guild the event was from
    if(guildID !== currentGuild) //if the current guildID is not correct for processing this event
    {
        currentGuild = guildID; //update current guild
        if(fs.existsSync(`${configFolder}${currentGuild}.json`)) //config file for the server already exists
        {
            config = JSON.parse(fs.readFileSync(`${configFolder}${currentGuild}.json`)); //loads config for that server
        }
        else //server does not have a config file
        {
            config = JSON.parse(fs.readFileSync(`${configFolder}default-config.json`)); //does not have bot/voice channels defined, noone opted in
        }
        //update varaibles to objects representing this servers channels (null is default-config, edge case accounted for in event handlers)
        botChannel = client.channels.cache.get(config.botChannel);
        voiceChannel = client.channels.cache.get(config.voiceChannel);
    }
}

//saves changed JSON data to configuration file for [currentGuild]
function saveConfig()
{
    try
    {
        let buffer = JSON.stringify(config,null,2); //converts the JSON onbect to the string notation + human readable format
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
})

/*  triggers when someone leaves/joins a channel (also triggers when someone mutes/unmutes)
*   This function is responsible for determining the number of people in the designated voicechannel. If the number of people
*   was previously zero, and after the voiceStateUpdate it is more than zero, everyone who is opted in will be notified and asked to join. 
*   Does nothing when voiceChannel is not set, counts number of members but does not notify people when botchannel is not set.
*/
client.on("voiceStateUpdate", (event) => {
    loadServerConfig(event); //passes event so that the server ID can be discovered and used to load the correct config file
    if(config.voiceChannel !== "") //if the voice-channel is not configured then the member count can't be processed
    {
        let members = voiceChannel.members; //members is a Map with info on users in the channel, the maps key is the user IDs
        var userCount = voiceChannel.members.size; //number of people in the voice channel

        //if the number of people in the channel has gone from 0 to >0
        if((userCount!== 0 && lastUserCountMap.get(currentGuild) === 0) && config.botChannel !== "") //if the bot-channel is not set up then no notification can be sent, however the number of members in the voice-channal can still be updated
        {
            let inChannel = Array.from(members.keys()); //gets userIDs of all users in the voiceChannel (typically just one, but redundency is important)
            let buffer = "";
            config.optedIn.forEach(function(userID) //for every user in this server that is opted-in
                {
                    if(!inChannel.includes(userID)) //if this user is not already in the channel
                    {
                        buffer += `<@${userID}>, `; //notify them
                    }
                })
            if(buffer !== "") //buffer will be empty if the only person who is opted in is the person who joined the channel (fringe case)
            {
                buffer += "come join us.";
                botChannel.send(buffer);
            }
        }

        lastUserCountMap.set(currentGuild,userCount); //updates number of users in the channel for this server
    }
})

/*  triggers when someone sends a message, the bot can accept commands from any channel
*   This function is responsible for interpreting commands and then executing the associated functions.
*   A messages first letter must be [config.prefix] otherwise the bot will assume it is not a command and ignore it
*/
client.on('message', (message) => {
    loadServerConfig(message); //passes event so that the server ID can be discovered and used to load the correct config file

    //starts trying to interpret message is it begins with [prefix] and if the messages author was not a bot
    if (message.content.startsWith(config.prefix) && !message.author.bot)
    {
        let command = message.content.substring(1); //removes [prefix] from command
        command = command.toLowerCase();
        let args = command.split(" "); //splits line into command+arguments, for commands that need arguments
        command = args.shift(); //removes command and puts it into command variable, any arguments will be left in args

        if(command === "set-bot-channel") //outside of switch because this is the only command that can be done before having a bot channel, other commands will be ignored
        {
            commandSetBotChannel(args[0]); //passes the argument (channelID) to the function
        }
        else if(config.botChannel !== "") //if the bot channel has been configured
        {
            switch(command)
            {
                case "help":
                    commandHelp(args[0]);
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
                case "show-opted-in":
                    commandShowOptedIn();
                    break;
                default:
                    //commandUnknown(); //works but creates too much spam when operating other bots in the server that use the same prefix, as far as I can tell other bots ignore commands that aren't meant for them, so I will do the same with mine
            }
        }
    }
  });

/*  Executes when bot joins a server, prompts users to configure it.
*   The bot will get the first usable text-channel and will use it to request configuration via the above commands.
*/
client.on("guildCreate",function(guild)
{
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

/*  [config.prefix]help -gives the user a list of commands when NO ARGUMENT is passed
*   When a user types help followed by the name of a command they will be given detailed information about what the command does.
*   If the user requests help for an unrecognised command they will be told it does not exist.
*/
function commandHelp(argument)
{
    let buffer;
    if(argument === "" || argument === null || argument === undefined) //if there is no argument show a list of commands and how to get more detail
    {
     buffer   =  "Hello, my purpose is to notify people with an @[username] when a voice channel becomes active.\n"
                 +`This is an opt-in service, if you wish to be notifed then type "${config.prefix}opt-in" into this chat.\n`
                 +"Valid  commands:\n"
                 +`  ${config.prefix}opt-in\n`
                 +`  ${config.prefix}opt-out\n`
                 +`  ${config.prefix}set-bot-channel [channel ID]  \n`
                 +`  ${config.prefix}set-voice-channel [channel ID] \n`
                 +`  ${config.prefix}set-prefix [character] \n`
                 +`  ${config.prefix}show-opted-in \n`
                 +`Type ${config.prefix}help [command] for information about each command. (don't include the brackets)\n`
                 +`For Example: ${config.prefix}help set-voice-channel.`;
    }
    else //argument supplied - if the argument is a valid command tell the user about said command
    {
        if(argument.startsWith(config.prefix)) //if the user included the prefix infront of the command they wanted information about
        {
            argument = argument.substring(1); //removes the prefix
        }
        switch(argument)
        {
            case "opt-in":
                buffer = `${config.prefix}opt-in opts you in to receive notifications when people join the monitored voice-channel.`;
                break;
            case "opt-out":
                buffer = `${config.prefix}opt-out opts you out of receiving notifications.`
                break;
            case "set-bot-channel":
                buffer = `${config.prefix}set-bot-channel [channel ID] tells me what channel to type to, I need the channel ID (not the name) which you can get by right-clicking on the channel with developer mode enabled.`
                break;
            case "set-voice-channel":
                buffer = `${config.prefix}set-voice-channel [channel ID] tells me what voice channel to monitor. When the number of people in this channel goes from 0 -> <0 I will notify everyone who is opted in (notifcations are sent in the botchannel). I need the channel ID (not the name) which you can get by right-clicking on the channel with developer mode enabled.`
                break;
            case "set-prefix":
                buffer = `${config.prefix}set-prefix [character] tells me what letter to look for when giving me a command. e.g. if the prefix is set to "-" then my help command would be "-help".`
                break;
            case "show-opted-in":
                buffer = `${config.prefix}show-opted-in will give you a list of every user on the server who will be notified when someone joins the monitored voicechannel.`
                break;
            default:
                buffer = `${argument} is not a recognised command`;
        }
    }
    botChannel.send(buffer);
}

//[config.prefix]show-opted-in - writes the message "Opted in: [usernames..]" and lists all usernames opted in for this guild
function commandShowOptedIn()
{
    buffer = "Opted in: ";
    let guild = client.guilds.cache.get(currentGuild); //uses ID to get guildObject

    config.optedIn.forEach(function(userID,index) //for each user opted in in this guild
    {
        let username = guild.member(userID).user.username; //guild method gets user object via their ID, then gets username from properties
        buffer += `${username}`; //add user to the buffer
        if(typeof config.optedIn[index+1] !== 'undefined') //if this isn't the last user
        {
            buffer += ", ";
        }
        else //if this is the last user that is opted in
        {
            buffer += ".";
        }
    })
    if(buffer === "Opted in: ") //if buffer has not been added to, aka no users are opted in
    {
        buffer += "no one";
    }
    botChannel.send(buffer);
}

//[config.prefix]set-bot-channel [channelID] - sets the bot channel according to the input, then saves the config
function commandSetBotChannel(channelID)
{
    config.botChannel = channelID; //update config
    botChannel = client.channels.cache.get(config.botChannel); //update object via ID

    if(botChannel !== null && botChannel !== undefined && botChannel.type === "text") //if the supplied ID corresponded to a valid TEXT channel
    {
        botChannel.send("This is now my channel.")
    }
    else //could not get channel from ID, message default channel
    {
        config.botChannel = ""; //do not save invalid ID, set the id as empty
        let defaultChannel = getDefaultChannel();
        defaultChannel.send("Something went wrong, make sure you give me the ID for the bot-channel, not the name.")
    }
    saveConfig(); //saves config - either the valid channel ID, or "" if the ID was invalid
}

//[config.prefix]set-voice-channel [channelID] sets the voice channel according to the input, then saves the config
function commandSetVoiceChannel(channelID)
{
    config.voiceChannel = channelID; //update config
    voiceChannel = client.channels.cache.get(config.voiceChannel); //update object via ID
    if(voiceChannel !== null && voiceChannel !== undefined && voiceChannel.type === "voice") //if the supplied ID corresponded to a valid VOICE channel
    {
        botChannel.send(`Now monitoring ${voiceChannel.name}.`);
    }
    else //if [channelID] did not correspond to a valid channel
    {
        config.voiceChannel = ""; //do not save invalid ID, set the id as empty
        botChannel.send("Something went wrong, make sure you give me the ID for the voice-channel, not the name.")
    }
    saveConfig(); //saves config - either the valid channel ID, or "" if the ID was invalid
}

//[config.prefix]set-prefix [newPrefix] - sets the command prefix according to the input, then saves the config
function commandSetPrefix(newPrefix)
{
    if(newPrefix === "" || newPrefix === null || newPrefix === undefined) //depending on how a user messes up the invalid "new prefix" could be any three of these
    {
        config.prefix = "!"; //if prefix is invalid reset to the default prefix
        let buffer = "Something went wrong, make sure to type one prefix character after the command."
                    +"Prefix has been reverted to default (!)."
        botChannel.send(buffer);
    }
    else
    {
        config.prefix = newPrefix.charAt(0); //if multiple characters are entered only the first will be used
        botChannel.send(`Now using "${config.prefix}" as the new prefix.`)
    }
    saveConfig();
}

//[config.prefix]opt-in - adds user who sent the command to the opted-in list
function commandOptIn(author)
{
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

//[config.prefix]opt-out - removes user who send the command from the opted-in list
function commandOptOut(author)
{
    let username = author.username //gets the username of the auther who asked to opt-out
    let userID = author.id; //gets the ID of the user (this is what's used for tagging)
    let position = config.optedIn.indexOf(userID);
    if(position != -1) //if user is in the list
    {
        config.optedIn.splice(position,1); //removes element at [positon] (ID of user opting out)
        saveConfig();
        botChannel.send(`${username}, you have been opted out`);
    }
    else //if user is not in the list
    {
        botChannel.send(`${username}, you were not opted in.`);
    }
}

//[config.prefix][invalid command] - for when typed command is not recognised
function commandUnknown()
{
    botChannel.send(`I don't recognise that command.\nTry "${config.prefix}help" for valid commands.`);
}
//############ end defining recognised commands ###################

//const keepAlive = require("./server");
//keepAlive();

//code before this point is configuring the bot, line below is where is actually connects to the server and starts listening
client.login(config.token);