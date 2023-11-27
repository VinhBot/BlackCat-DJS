import { Client as BlackCatClient } from "../dist/index.js";
import colors from "chalk";

const client = new BlackCatClient({
  /* 
  discordClient: {
    // Discord.Client
  }, 
  */
  config: {
    tokenBot: "ODgxNzA5MTQ2Njk1NjY3Nzcz.G_jbhs.ljgkIBFtLCUyjmK8MW8VUsMGBd-JIGvlQqzdV8",
    prefix: "!",
    developer: ""
  },
  // chạy events do nph đề xuất
  commandHandler: {
    prefixCommand: true,
    slashCommand: true,
    setLanguage: "en",
    path: {
      prefixCommand: "./test/Commands",
      slashCommand: "./test/slashCommands",
    },
  },
});

client.on("ready", async (bot) => {
  console.log(colors.blue(bot.user.username + " đã sẵn sàng hoạt động"));
});