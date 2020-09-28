# NotifyBot
A discord bot that will notify users who opt-in when people begin joining the monitored voice channel.  

I beleive the comments in the code are quite self-explanitory, so I'll explain how it is used by the end user instead.  
This bot, once added to the server will find the first text-channel it can (detaulf channel) and will thank the users for being added, then give instructions on how to configure it.  
Necessary configuration:  
  The text-channel for the bot to type to, until this is done all commands (except for setting this channel) are ignored, and errors are expressed in the default channel  
  The audio-channel that the bot will monitor, when the number of people in the channel goes from 0 -> >0 it will notify everyone who has opted in  
   
 Optional configuration:  
  The prefix to be prepended onto bot commands can be configured to any one character the user wants  
  The users can individually opt-in to be notified, they are not opted-in by default, I made this is an opt-in service instead of an opt-out one  
   
 Commands the bot understands:  
  help [argument] - help with no argument will show a list of commands; An argument which is a valid command will show more detailed information about that particulr command.  
  opt-in  -no argument  
  opt-out -no argument  
  set-bot-channel [channel ID]  
  set-voice-channel [channel ID]  
  set-prefix [new prefix]  
  show-opted-in   - will show every user in the server who is opted in.  
