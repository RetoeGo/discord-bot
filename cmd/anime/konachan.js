const commando = require("discord.js-commando");
const newEmbed = require("../../embed");
const got = require("got");

module.exports = class Xkcd extends commando.Command {
    constructor(client) {
        super(client, {
            name: "konachan",
            memberName: "konachan",
            group: "anime",
            description: "Random konachan image."
        });
    }

    async run(msg) {
        got("https://konachan.net/post.json?limit=1&page=" + Math.floor(Math.random() * 241260)).then(res => {
            var img = JSON.parse(res.body)[0];
            var embed = newEmbed();
            embed.setTitle("Konachan");
            embed.setDescription("By " + img.author);
            embed.setImage(img.file_url);
            msg.channel.send(embed);
        });
    }
};
