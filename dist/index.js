import { AsciiTable3 } from "ascii-table3";
import Discord from "discord.js";
import colors from "chalk";
import nodeUrl from "node:url";
import fs from "node:fs";

import vi from "./Language/vi.js";
import en from "./Language/en.js";

export class Client extends Discord.Client {
  constructor(options) {
    // Nếu `options.discordClient` không tồn tại, sử dụng một đối tượng Discord cụ thể; 
    // nếu tồn tại, sử dụng giá trị của `options.discordClient`.
    super(options.discordClient === null ? options.discordClient : {
      allowedMentions: {
        parse: ["roles", "users", "everyone"],
        repliedUser: false,
      },
      partials: [Object.keys(Discord.Partials)],
      intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMembers,
      ],
    }); 
    /*
     * Thay đổi ngôn ngữ cho package.
     * @type {string && default "vi"}
     */
    this.currentLanguage = options.commandHandler.setLanguage || "vi";
    /*
     * tùy chọn dành cho cmdHandler
     * @type {commandOption}
     */
    this.command = options.commandHandler;
    /*
     * tùy chọn configJson
     * @type {configOption}
     */
    this.config = options.config;
    /*
     * @info Discord.Collection, Khởi tạo một đối tượng Collection từ thư viện Discord.js để lưu trữ các lệnh
     */
    // Tạo một Discord Collection mới để lưu trữ các lệnh dạng slash
    this.slashCommands = new Discord.Collection();
    // Tạo một Discord Collection mới để quản lý thời gian chờ giữa các lệnh
    this.cooldowns = new Discord.Collection();
    // Tạo một Discord Collection mới để lưu trữ các lệnh thông thường
    this.commands = new Discord.Collection();
    // Tạo một Discord Collection mới để lưu trữ bí danh của các lệnh
    this.aliases = new Discord.Collection();
    // Gọi và sử dụng hàm.
    this.commandHandler();
    /**
     * Authorization token for the logged in bot.
     * Mã thông báo ủy quyền cho bot đã đăng nhập.
     * @type {?string}
     */
    if (!this.config.tokenBot || typeof this.config.tokenBot !== 'string') {
      console.error(colors.blue("[BlackCat-DJS]: ") + colors.red(this.getLocalizedString("tokenBot")));
    } else {
      this.login(this.config.tokenBot);
    };
  };
  /*
   * @info Định nghĩa một hàm xử lý lệnh được gọi là `commandHandler` với từ khóa `async`.
   */
  async commandHandler() {
    if (this.command.prefixCommand === Boolean(true)) {
      // Tạo bảng lệnh (commandTable): •Sử dụng thư viện AsciiTable3 để tạo bảng với tiêu đề là "Tên Lệnh" và "Trạng thái". •setStyle('unicode-round') thiết lập kiểu hiển thị của bảng.
      const commandTable = new AsciiTable3('Commands').setHeading(this.getLocalizedString("commandHander.prefix.cmd1"), this.getLocalizedString("commandHander.prefix.cmd2")).setStyle('unicode-round');
      // Đọc các tệp lệnh từ đường dẫn cụ thể (commandsPath):
      const commandsPath = this.command.path.prefixCommand;
      // Sử dụng fs.readdirSync để đọc danh sách thư mục trong đường dẫn và áp dụng map để duyệt qua từng thư mục.
      await Promise.all(fs.readdirSync(commandsPath).map(async (dir) => {
        // Đọc danh sách tệp tin trong mỗi thư mục và lọc ra các tệp có đuôi là ".js".
        const commands = fs.readdirSync(`${commandsPath}/${dir}/`).filter((file) => file.endsWith(".js"));
        for (let file of commands) {
          // Dùng import để đọc nội dung của mỗi tệp và thiết lập lệnh từ thuộc tính default.
          const pull = await import(this.globalFilePath(`${commandsPath}/${dir}/${file}`)).then((x) => x.default);
          // Nếu lệnh có tên (pull.name), thêm vào this.commands được khai báo thì sẽ in ra commandTable với trạng thái "✔️ sẵn sàng".
          if (pull.name) {
            this.commands.set(pull.name, pull);
            commandTable.addRowMatrix([[pull.name, this.getLocalizedString("commandHander.prefix.cmd3")]]);
          } else {
            // Nếu không có tên, thêm vào commandTable với trạng thái "❌ Lỗi".
            commandTable.addRowMatrix([[file, this.getLocalizedString("commandHander.prefix.cmd4")]]);
            return;
          };
          // Nếu có bí danh (pull.aliases), thêm mỗi bí danh vào this.aliases.
          if (pull.aliases && Array.isArray(pull.aliases)) {
            pull.aliases.forEach((alias) => this.aliases.set(alias, pull.name));
          };
        };
      }));
      // In bảng đã tạo ra console với màu sắc cyan.
      console.log(colors.cyan(commandTable.toString()));
      // Đây là một sự kiện (event listener) được đăng ký để lắng nghe sự kiện MessageCreate. Điều này có nghĩa là khi một tin nhắn mới được tạo ra trong máy chủ Discord mà bot đang tham gia, đoạn mã trong hàm callback này sẽ được thực thi.
      this.on(Discord.Events.MessageCreate, async (message) => {
        // Lấy tiền tố (prefix) được đặt trong cấu hình của bot. Có vẻ như đối tượng this có một thuộc tính config và trong config có một thuộc tính prefix.
        const prefix = this.config.prefix;
        // Kiểm tra nếu tin nhắn không phải từ bot và bắt đầu bằng prefix đã cho
        if (!message.author.bot && message.content.startsWith(prefix)) {
          // Cắt bỏ tiền tố và khoảng trắng ở đầu và cuối nội dung tin nhắn, sau đó chia thành mảng các tham số (args).
          const args = message.content.slice(prefix.length).trim().split(/ +/g);
          // Lấy lệnh từ mảng tham số và chuyển đổi thành chữ thường.
          const cmd = args.shift().toLowerCase();
          // Nếu độ dài của lệnh sau khi chuyển đổi thành chữ thường là 0, không làm gì cả.
          if (cmd.length === 0) return;
          // Lấy lệnh từ một bộ sưu tập (presumably Map) của các lệnh sử dụng tên lệnh.
          let command = this.commands.get(cmd);
          // Nếu không tìm thấy lệnh trực tiếp bằng tên, kiểm tra xem có lệnh nào có bí danh (alias) giống với tên lệnh không.
          if (!command) command = this.commands.get(this.aliases.get(cmd));
          if (command) {
            const embed = new Discord.EmbedBuilder().setTitle(this.getLocalizedString("commandHander.prefix.mes1")).setColor("Random"); // Tạo một đối tượng embed để tạo thông báo nhúng (embedded message) với tiêu đề "Thiếu quyền" và màu ngẫu nhiên.
            // Nếu lệnh yêu cầu quyền hạn (command.permissions) và người dùng không có đủ quyền, bot sẽ gửi một thông báo nhúng thông báo về việc thiếu quyền.
            if (command.permissions && !message.member.permissions.has(Discord.PermissionsBitField.resolve(command.permissions || []))) return message.reply({
              embeds: [embed.setDescription(this.getLocalizedString("commandHander.prefix.mes2", {
                permissions: command.permissions
              }))],
            });
            // Nếu người dùng đang trong thời gian cooldown cho lệnh, bot sẽ gửi một thông báo về việc đợi để sử dụng lệnh lại sau một khoảng thời gian.
            if (onCoolDown(this.cooldowns, message, command)) return message.reply({
              content: this.getLocalizedString("commandHander.prefix.mes3", {
                timestamp: onCoolDown(this.cooldowns, message, command).toFixed(),
                cmdName: command.name
              })
            });
            // Nếu lệnh chỉ dành cho chủ sở hữu (command.owner) và người gửi lệnh không phải là chủ sở hữu, bot sẽ gửi một thông báo về việc chỉ chủ sở hữu mới có thể sử dụng lệnh này.
            if (command.owner && message.author.id !== this.config.developer) return message.reply({
              embeds: [embed.setDescription(this.getLocalizedString("commandHander.prefix.mes4", {
                developer: this.config.developer
              }))]
            });
            // Nếu tìm thấy lệnh, thực thi lệnh đó bằng cách gọi hàm command.command và truyền vào các đối số như this (đối tượng bot cách gọi khác là client), message (đối tượng tin nhắn), args (mảng tham số), và prefix (tiền tố của lệnh).
            command.command(this, message, args, prefix);
            // Nếu không tìm thấy lệnh, bot sẽ gửi một tin nhắn phản hồi nói rằng lệnh không hợp lệ và sau đó tự động xóa tin nhắn phản hồi đó sau 10 giây.
          } else return message.reply({ content: this.getLocalizedString("commandHander.prefix.mes5", { prefix: prefix }) }).then((msg) => {
            setTimeout(() => msg.delete(), this.ms("5s")); // tự động xóa sau 5 giây
          });
        } else {
          // Kiểm tra nếu bot được mention trong tin nhắn
          if (message.mentions.users.has(this.user.id)) {
            return message.reply({ content: this.getLocalizedString("commandHander.prefix.mes6", { prefix: prefix }) });
          };
        };
      });
      // Hàm kiểm tra thời gian chờ giữa các lần thực hiện lệnh trong Discord
      function onCoolDown(cooldowns, message, commands) {
        // Kiểm tra điều kiện đầu vào: nếu không có message hoặc commands, thoát khỏi hàm
        if (!message || !commands) return;
        // Kiểm tra xem lệnh đã có trong bảng thời gian chờ chưa
        if (!cooldowns.has(commands.name)) {
          // Nếu chưa có, khởi tạo bảng thời gian chờ với tên lệnh là key
          cooldowns.set(commands.name, new Discord.Collection());
        };
        // Lấy thời gian hiện tại
        const now = Date.now();
        // Lấy bảng thời gian chờ của lệnh
        const timestamps = cooldowns.get(commands.name);
        // Xác định thời gian chờ giữa các lần thực hiện lệnh
        const cooldownAmount = commands.cooldown * 1000;
        // Kiểm tra xem thành viên đã sử dụng lệnh trong khoảng thời gian chờ hay chưa
        if (timestamps.has(message.member.id)) {
          // Nếu đã sử dụng, xác định thời gian kết thúc thời gian chờ của lần trước
          const expirationTime = timestamps.get(message.member.id) + cooldownAmount;
          // So sánh với thời gian hiện tại để xác định còn bao lâu có thể sử dụng lại lệnh
          if (now < expirationTime) {
            return (expirationTime - now) / 1000; // Trả về thời gian còn lại trước khi có thể sử dụng lại lệnh
          } else {
            // Nếu đã hết thời gian chờ, cập nhật thời gian và reset thời gian chờ
            timestamps.set(message.member.id, now);
            setTimeout(() => timestamps.delete(message.member.id), cooldownAmount);
            return false;
          };
        } else {
          // Nếu chưa sử dụng lệnh, cập nhật thời gian và reset thời gian chờ
          timestamps.set(message.member.id, now);
          setTimeout(() => timestamps.delete(message.member.id), cooldownAmount);
          return false;
        };
      };
    };
    /**[slashCommands]*/
    if (this.command.slashCommand === Boolean(true)) {
      // Khởi tạo bảng ASCII (AsciiTable3) để hiển thị thông tin về slashCommands.
      let slashTable = new AsciiTable3('slashCommands').setHeading(this.getLocalizedString("commandHander.slash.cmd1"), this.getLocalizedString("commandHander.slash.cmd2")).setStyle('unicode-round');
      // Khởi tạo một mảng để lưu trữ tất cả thông tin về slashCommands (allSlashCommands).
      const allSlashCommands = [];
      // Lấy đường dẫn của slashCommands từ this.command.path.slashCommand.
      const slashPath = this.command.path.slashCommand;
      // Lặp qua từng thư mục trong thư mục slashCommands và xử lý từng file.
      for (const dir of fs.readdirSync(slashPath)) {
        const filterCommands = fs.readdirSync(`${slashPath}/${dir}/`).filter((file) => file.endsWith(".js"));
        for (const slashCmds of filterCommands) {
          try {
            // Trong vòng lặp bên trong, thử import từng file slash command và xử lý nếu không có lỗi.
            const command = await import(this.globalFilePath(`${slashPath}/${dir}/${slashCmds}`)).then((e) => e.default);
            this.slashCommands.set(command.name, command); // this.slashCommands: Một Collection để lưu trữ các slash commands của bot.
            // !command.name || !command.description: Kiểm tra xem lệnh có tên hoặc mô tả không. Nếu một trong những điều kiện đó sai (! là toán tử phủ định), thì có lỗi. Nếu có lỗi, hiển thị "❌ Lỗi", ngược lại hiển thị "✔️ sẵn sàng".
            slashTable.addRowMatrix([[command.name, !command.name || !command.description ? this.getLocalizedString("commandHander.slash.cmd3") : this.getLocalizedString("commandHander.slash.cmd4")]]); 
            allSlashCommands.push({ // allSlashCommands: Một mảng để lưu trữ thông tin về tất cả các slash commands.
              name: command.name.toLowerCase(),
              description: command.description,
              type: command.type,
              options: command.options || null,
            });
          } catch (error) {
            console.error(this.getLocalizedString("commandHander.slash.cmd5", {
              slashCmds: slashCmds,
              slashCmds1: error.message
            }));
          };
        };
      };
      console.log(colors.green(slashTable.toString())); // Hiển thị bảng thông tin về slash commands dưới dạng ASCII.
      // HTTP request đăng ký (register) slash commands khi client của bot đã sẵn sàng (ready). 
      this.on(Discord.Events.ClientReady, async () => {
        // Khởi tạo đối tượng rest từ lớp Discord.REST: Tạo một đối tượng REST để thực hiện các HTTP requests đến Discord API, sử dụng phiên bản API 10 và token của bot từ cấu hình (this.config.tokenBot).
        const rest = new Discord.REST({ version: "10" }).setToken(this.config.tokenBot);
        // Gửi HTTP PUT request để đăng ký slash commands:
        // •Gửi một HTTP PUT request đến Discord API endpoint applicationCommands với ID của bot (this.user.id). Dữ liệu gửi đi bao gồm mảng allSlashCommands chứa thông tin về tất cả các slash commands.
        // •return await: Đảm bảo rằng hàm này trả về một promise, chờ đợi cho đến khi request hoàn thành.
        // •rest.put: Gửi HTTP PUT request.
        // •Discord.Routes.applicationCommands: Xác định endpoint của API để đăng ký slash commands.
        // •{ body: allSlashCommands }: Gửi dữ liệu trong phần thân của request, bao gồm thông tin về các slash commands
        return await rest.put(Discord.Routes.applicationCommands(this.user.id), {
          body: allSlashCommands
        });
      });
      // đoạn này tự hiểu nhé lười phân tích vcl :))
      this.on(Discord.Events.InteractionCreate, async (interaction) => {
        if (interaction.type === Discord.InteractionType.ApplicationCommand) {
          if (!this.slashCommands.has(interaction.commandName) || interaction.user.bot || !interaction.guild) return;
          const SlashCommands = this.slashCommands.get(interaction.commandName);
          if (!SlashCommands) return;
          if (SlashCommands) {
            try {
              const embed = new Discord.EmbedBuilder().setTitle(this.getLocalizedString("commandHander.slash.slash1")).setColor("Random");

              if (SlashCommands.owner && this.config.developer.includes(interaction.user.id)) return interaction.reply({
                content: this.getLocalizedString("commandHander.slash.slash2")
              });
              if (SlashCommands.userPerms && !interaction.member.permissions.has(Discord.PermissionsBitField.resolve(SlashCommands.userPerms || []))) return interaction.reply({
                embeds: [embed.setDescription(this.getLocalizedString("commandHander.slash.slash3", {
                  cmd1: SlashCommands.userPerms,
                  cmd2: interaction.channelId,
                  cmd3: SlashCommands.name
                }))]
              });

              SlashCommands.run(this, interaction);
            } catch (error) {
              if (interaction.replied) return await interaction.editReply({
                embeds: [new Discord.EmbedBuilder().setDescription(this.getLocalizedString("commandHander.slash.slash4"))],
                ephemeral: true,
              });
              console.log(error);
            };
          };
        };
      });
    };
  };
  /**
   * @info Chuyển đổi mã màu hex sang dạng RGB.
   * @param {string} hex Mã màu hex cần chuyển đổi.
   * @returns {number[]} Mảng chứa giá trị RGB tương ứng.
   * @example
   * const hexColor = "#3498db";
   * const rgbArray = toRgb(hexColor);
   * console.log(rgbArray); // Output: [52, 152, 219]
   */
  toRgb(hex) {
    // Chia tách mã màu hex và phân tích cú pháp số nguyên.
    const color1 = parseInt(hex.slice(1, 3), 16);
    const color2 = parseInt(hex.slice(3, 5), 16);
    const color3 = parseInt(hex.slice(5, 7), 16);
    // Trả về mảng chứa giá trị RGB.
    return [color1, color2, color3];
  };
  /**
   * @info Chuyển đổi đường dẫn tệp thành URL toàn cầu (global URL) sử dụng pathToFileURL của Node.js.
   * @param {string} path Đường dẫn tệp cần chuyển đổi.
   * @returns {string} URL toàn cầu hoặc đường dẫn ban đầu nếu chuyển đổi không thành công.
   * @example
   * const filePath = "/path/to/file.txt";
   * const globalUrl = globalFilePath(filePath);
   * console.log(globalUrl);
   * // Output: "file:///path/to/file.txt" (nếu chuyển đổi thành công)
   * // Hoặc: "/path/to/file.txt" (nếu chuyển đổi không thành công)
   */
  globalFilePath(path) {
    // Sử dụng pathToFileURL của Node.js để chuyển đổi đường dẫn thành URL.
    // Nếu thành công, trả về href của URL; nếu không, trả về đường dẫn ban đầu.
    return nodeUrl.pathToFileURL(path)?.href || path;
  };
  /**
   * @info Chuyển đổi một chuỗi thời gian vào giá trị tương ứng tính bằng mili giây.
   * @param {string} str Chuỗi thời gian cần chuyển đổi.
   * @returns {number} Tổng thời gian tính bằng mili giây.
   * @example
   * const timeString = "1w 3d 5h";
   * const totalTimeInMs = ms(timeString);
   * console.log(totalTimeInMs); // Output: 910800000 (tổng thời gian tính bằng mili giây)
   */
  ms(str) {
    // timeMap là một đối tượng loại thời gian (w, d, h, m, s) với giá trị tương ứng ở đơn vị mili giây.
    const timeMap = {
      'w': 604800000, // tuần
      'd': 86400000,  // ngày
      'h': 3600000,   // giờ
      'm': 60000,     // phút
      's': 1000       // giây
    };
    // regex là một biểu thức chính quy để kiểm tra xem một chuỗi có định dạng thời gian hợp lệ hay không.
    const regex = /^(\d{1,}\.)?\d{1,}([wdhms])?$/i;
    // sum là biến lưu tổng thời gian tính bằng mili giây.
    let sum = 0;
    // arr là một mảng chứa các phần tử của chuỗi đã được lọc dựa trên regex. Các phần tử này đại diện cho các phần của thời gian.
    const arr = ('' + str).split(' ').filter(v => regex.test(v));
    // Duyệt qua từng phần tử trong arr.
    for (let i = 0; i < arr.length; i++) {
      const time = arr[i];
      // Đối với mỗi phần tử, kiểm tra xem nó có khớp với /[wdhms]$/i (kí tự cuối cùng là w, d, h, m, s) hay không.
      const match = time.match(/[wdhms]$/i);
      if (match) {
        // Nếu khớp, lấy loại thời gian (type), chuyển đổi giá trị thành số (val), và thêm vào sum dựa trên timeMap.
        const type = match[0].toLowerCase();
        const val = Number(time.replace(type, ''));
        sum += val * timeMap[type];
      } else if (!isNaN(parseFloat(time)) && isFinite(parseFloat(time))) {
        // Nếu không khớp, kiểm tra xem nó có phải là số hay không, và nếu đúng, thêm giá trị số đó vào sum.
        sum += parseFloat(time);
      };
    };
    // Hàm trả về tổng thời gian tính bằng mili giây.
    return sum;
  };
  /**
   * @info Hàm `getLocalizedString` dùng để lấy chuỗi dịch dựa trên khóa và thực hiện thay thế giá trị nếu cần.
   * @param {string} key Khóa để xác định chuỗi cần lấy.
   * @param {Object} [replacements] Đối tượng chứa các giá trị thay thế có thể được sử dụng.
   * @warning Không thể sử dụng hàm này bên ngoài module hoặc class chứa nó do sự phụ thuộc vào ngôn ngữ (`en` và `vi`) và biến `this.currentLanguage`.
   */
  getLocalizedString(key, replacements) {
    // Đối tượng chứa các chuỗi cho từng ngôn ngữ
    let languageStrings = {
      "en": en, // tiếng anh 
      "vi": vi, // tiếng việt
    };
    // Truy cập đệ quy vào đối tượng ngôn ngữ
    let currentObj = languageStrings[this.currentLanguage];
    for (const k of key.split('.')) {
      currentObj = currentObj[k];
      if (!currentObj) return "Không tìm thấy chuỗi ký tự";
    };
    // Thực hiện thay thế các giá trị
    if (typeof currentObj === 'string' && replacements) {
      for (const [placeholder, value] of Object.entries(replacements)) {
        currentObj = currentObj.replace(`{${placeholder}}`, value);
      };
    };
    return currentObj;
  };
  /**
   * Chuyển đổi đối tượng thành định dạng JSON.
   * @returns {Object} Đối tượng JSON tương ứng với đối tượng hiện tại.
   */
  toJSON() {
    return { ...this };
  };
};

/**
 * Đại diện cho một bộ xây dựng (builder) cho các lệnh bot.
 * @class
 * @param {Object} options - Các tùy chọn để khởi tạo lệnh bot.
 * @param {boolean} options.owner - Xác định xem lệnh có phải chỉ dành cho chủ bot hay không.
 * @param {number} options.cooldown - Thời gian chờ giữa các lần sử dụng lệnh, mặc định là 3000 ms.
 * @param {Array} options.permissions - Quyền mặc định cho thành viên để chạy lệnh.
 * @param {string} options.description - Mô tả của lệnh.
 * @param {string} options.category - Thư mục chứa lệnh.
 * @param {Array} options.aliases - Danh sách các tên lệnh phụ (aliases).
 * @param {function} options.command - Hàm thực hiện lệnh.
 * @param {string} options.usage - Cách sử dụng lệnh.
 * @param {string} options.name - Tên của lệnh.
 * @returns {commandBuilder} Một phiên bản mới của commandBuilder.
 */

export class commandBuilder {
  constructor(options = {}) {
    const { owner, cooldown = 3000, permissions = [], description, aliases = [], name, usage, category, command } = options;
    this.owner = Boolean(owner);
    this.cooldown = Number(cooldown);
    this.permissions = permissions;
    this.description = description;
    this.category = category;
    this.aliases = aliases;
    this.command = command;
    this.usage = usage;
    this.name = name;
  }

  /**
   * Tuần tự hóa trình tạo này thành dữ liệu JSON tương thích với API.
   * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh bot.
   * @example
   * // Chuyển đổi thành JSON
   * const commandOptions = { name: 'example', description: 'An example command', command: (interaction) => interaction.reply('Command executed!') };
   * const builder = new commandBuilder(commandOptions);
   * const commandJSON = builder.toJSON();
   */
  toJSON() {
    return {
      owner: this.owner,
      cooldown: this.cooldown,
      permissions: this.permissions,
      description: this.description,
      category: this.category,
      aliases: this.aliases,
      command: this.command,
      usage: this.usage,
      name: this.name,
    };
  }

  /**
   * Đặt tên của lệnh này.
   * @param {string} name - Tên để sử dụng.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt tên lệnh
   * const builder = new commandBuilder().setName('example');
   */
  setName(name) {
    if (name.length > 30) {
      console.log("Tên lệnh không dài quá 30 chữ cái");
    } else if (name.length < 1) {
      console.log("Tên lệnh không nhỏ quá 1 chữ cái");
    } else {
      this.name = name;
    }
    return this;
  }

  /**
   * Thiết lập danh sách tên lệnh phụ (aliases) cho lệnh.
   * @param {Array} aliases - Danh sách các tên lệnh phụ.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt tên lệnh phụ
   * const builder = new commandBuilder().setAliases(['ex', 'sample']);
   */
  setAliases(aliases) {
    if (aliases.length > 30) {
      console.log("Tên lệnh phụ không dài quá 30 chữ cái");
    } else if (aliases.length < 1) {
      console.log("Tên lệnh phụ không nhỏ quá 1 chữ cái");
    } else {
      this.aliases = aliases;
    }
    return this;
  }

  /**
   * Thiết lập cách sử dụng lệnh.
   * @param {string} usage - Cách sử dụng lệnh.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt cách sử dụng lệnh
   * const builder = new commandBuilder().setUsage('example [options]');
   */
  setUsage(usage) {
    this.usage = usage;
    return this;
  }

  /**
   * Thiết lập thư mục chứa lệnh.
   * @param {string} category - Thư mục chứa lệnh.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt thư mục chứa lệnh
   * const builder = new commandBuilder().setCategory('Utilities');
   */
  setCategory(category) {
    this.category = category;
    return this;
  }

  /**
   * Đặt chủ sở hữu của lệnh.
   * @param {boolean} owner - Xác định xem lệnh có phải chỉ dành cho chủ bot hay không.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt chủ sở hữu
   * const builder = new commandBuilder().setOwner(true);
   */
  setOwner(owner) {
    this.owner = owner;
    return this;
  }

  /**
   * Thiết lập thời gian chờ giữa các lần sử dụng lệnh.
   * @param {number} cooldown - Thời gian chờ (ms).
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt thời gian chờ
   * const builder = new commandBuilder().setCooldown(5000);
   */
  setCooldown(cooldown) {
    this.cooldown = cooldown;
    return this;
  }

  /**
   * Thiết lập mô tả cho lệnh.
   * @param {string} description - Mô tả của lệnh.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt mô tả lệnh
   * const builder = new commandBuilder().setDescription('An example command');
   */
  setDescription(description) {
    if (!description) {
      console.log("Bạn chưa thêm mô tả cho lệnh " + this.name);
    } else {
      this.description = description;
    }
    return this;
  }

  /**
   * Đặt quyền mặc định mà thành viên phải có để chạy lệnh này.
   * @param {Array} permissions - Danh sách quyền cần thiết.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @see {@link https://discord.com/developers/docs/interactions/application-commands#permissions}
   * @example
   * // Đặt quyền mặc định
   * const builder = new commandBuilder().setDefaultMemberPermissions(['SEND_MESSAGES']);
   */
  setDefaultMemberPermissions(permissions) {
    this.permissions = permissions;
    return this;
  }

  /**
   * Đặt hàm thực hiện lệnh.
   * @param {function} command - Hàm thực hiện lệnh.
   * @returns {commandBuilder} Phiên bản của commandBuilder sau khi được sửa đổi.
   * @example
   * // Đặt hàm thực hiện lệnh
   * const builder = new commandBuilder().addCommand((client, message, args, prefix) => message.reply('Command executed!'));
   */
  addCommand(command) {
    this.command = command;
    return this;
  }
};

/**
 * Đại diện cho một bộ xây dựng (builder) cho các lệnh gạt (slash commands) trên Discord.
 * @class
 * @param {Object} options - Các tùy chọn để khởi tạo lệnh gạt.
 * @param {string} options.name - Tên của lệnh gạt.
 * @param {string} options.description - Mô tả của lệnh gạt.
 * @param {Array} options.userPerms - Quyền cần thiết cho người dùng để thực hiện lệnh.
 * @param {boolean} options.owner - Đặt thành true để lệnh chỉ dành cho chủ bot, false để tắt.
 * @param {number} options.cooldown - Thời gian chờ giữa các lần sử dụng lệnh.
 * @param {string} options.type - Loại của lệnh.
 * @param {Object} options.options - Các tùy chọn bổ sung cho lệnh.
 * @param {function} options.run - Hàm sẽ được thực thi khi lệnh được gọi.
 * @returns {slashCommandBuilder} Một phiên bản mới của slashCommandBuilder.
 */

export class slashCommandBuilder {
  constructor({ name, description, userPerms, owner, cooldown, type, options, run }) {
    this.name = name; // Đặt tên
    this.description = description; // Đặt mô tả cho lệnh
    this.userPerms = userPerms; // Đặt quyền cần thiết cho người dùng để thực hiện lệnh
    this.owner = owner; // Đặt thành true để lệnh chỉ dành cho chủ bot, false để tắt
    this.cooldown = cooldown; // Đặt thời gian chờ
    this.options = options; // Đặt các tùy chọn bổ sung
    this.type = type; // Đặt loại lệnh
    this.run = run; // Đặt hàm sẽ được thực thi khi lệnh được gọi
  };
  /**
   * Thêm một lệnh con vào lệnh slash hiện tại.
   * @param {function} slashCommand - Hàm sẽ được thực thi khi lệnh con được gọi.
   * @returns {slashCommandBuilder} Phiên bản của slashCommandBuilder sau khi được sửa đổi.
   * @example
   * // Thêm lệnh con
   * const subCommand = (interaction) => {
   *   interaction.reply('Sub-command executed!');
   * };
   * const builder = new slashCommandBuilder({ name: 'parent', run: subCommand })
   *   .addSlashCommand(subCommand);
   */
  addSlashCommand(slashCommand) {
    this.run = slashCommand; // Đặt hàm cho lệnh con
    return this;
  };

  /**
   * Chuyển đổi bộ xây dựng lệnh slash thành đối tượng JSON.
   * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh slash.
   * @example
   * // Chuyển đổi thành JSON
   * const builder = new slashCommandBuilder({ name: 'example', description: 'Một lệnh ví dụ', run: interaction => interaction.reply('Command executed!') });
   * const commandJSON = builder.toJSON();
   */
  toJSON() {
    return { ...this };
  }
};