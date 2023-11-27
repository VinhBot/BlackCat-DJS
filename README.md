<div align="center">
	<br />
	<p>
		<a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
	</p>
	<br />
	<p>
		<a href="https://discord.gg/djs"><img src="https://img.shields.io/discord/222078108977594368?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
		<a href="https://www.npmjs.com/package/discord.js"><img src="https://img.shields.io/npm/v/discord.js.svg?maxAge=3600" alt="npm version" /></a>
		<a href="https://www.npmjs.com/package/discord.js"><img src="https://img.shields.io/npm/dt/discord.js.svg?maxAge=3600" alt="npm downloads" /></a>
		<a href="https://github.com/discordjs/discord.js/actions"><img src="https://github.com/discordjs/discord.js/actions/workflows/test.yml/badge.svg" alt="Tests status" /></a>
		<a href="https://codecov.io/gh/discordjs/discord.js" ><img src="https://codecov.io/gh/discordjs/discord.js/branch/main/graph/badge.svg?precision=2" alt="Code coverage" /></a>
	</p>
	<p>
		<a href="https://vercel.com/?utm_source=discordjs&utm_campaign=oss"><img src="https://raw.githubusercontent.com/discordjs/discord.js/main/.github/powered-by-vercel.svg" alt="Vercel" /></a>
		<a href="https://blackcat-profile.vercel.app/"><img src="https://raw.githubusercontent.com/discordjs/discord.js/main/.github/powered-by-workers.png" alt="Cloudflare Workers" height="44" /></a>
	</p>
</div>


## usage 
```js
import { Client as BlackCatClient } from "blackcat-djs";

const client = new BlackCatClient({
  /* 
  discordClient: {
    // Discord.Client
  }, 
  */
  config: {
    tokenBot: "", //"ODc4ODczNzgwNTk0ODM1NDc2.Gtko8U.nxzfNfxOC6rKvNphSzNigcT6NcF2UwU1EXVjgs",
    prefix: "!",
    developer: ""
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
```