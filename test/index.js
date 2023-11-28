import { Client as BlackCatClient } from "../dist/index.js";
import colors from "chalk";

const client = new BlackCatClient({
  /* 
  discordClient: {
    // Discord.Client 
  }, 
  */
  config: {
    tokenBot: "token bot",
    prefix: "!",
    developer: "id owner"
  },
  // chạy events do nph đề xuất
  commandHandler: {
    prefixCommand: true,
    slashCommand: true,
    setLanguage: "vi",
    path: {
      prefixCommand: "./test/Commands",
      slashCommand: "./test/slashCommands",
    },
  },
});

client.on("ready", async (bot) => {
  console.log(colors.blue(bot.user.username + " đã sẵn sàng hoạt động"));
});