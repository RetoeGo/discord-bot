async function makeRequest(endpoint: string): Promise<any> {
    const res = await fetch("http://localhost:8856/" + endpoint);
    return await res.json();
}

/**
 * Holds client data
 */
class Client {
    guild?: Guild;
    user?: User;
    available = false;

    constructor(guild?: Guild, user?: User) {
        this.guild = guild;
        this.user = user;
    }

    static async newClient(guild: string, user: string) {
        var c = new Client();
        c.guild = await Guild.getGuild(guild, c);
        c.user = await User.getUser(user, c);
        c.available = true;
        return c;
    }

    async hasPermission(permission: string): Promise<boolean> {
        if(!this.guild) throw new Error("Cannot use client before it's available");
        return await makeRequest("guild/" + this.guild.id + "/permission/" + encodeURI(permission));
    }
};

/**
 * Holds channel data
 */
class Channel {
    client: Client;
    guild: Guild;
    id: string;

    constructor({
        client,
        guild,
        id
    }: {
        client: Client,
        guild?: Guild,
        id: string
    }) {
        if(!client.guild) throw new Error("Cannot use client before it's ready");
        this.client = client;
        this.guild = guild || client.guild;
        this.id = id;
    }

    async send(content: string | Embed | object): Promise<SentMessage> {
        if(!content) throw new Error("Cannot send empty message");

        if(typeof content === "string") {
            content = {
                message: content
            };
        }
        if(!this.client.user) throw new Error("Cannot use client before it's available");
        const res = await fetch("http://localhost:8856/message/" + this.guild.id + "/" + this.id, {
            method: "POST",
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        });
        try {
            var id = await res.json();
        } catch(e) {
            console.warn(await res.text());
            throw new Error(e);
        }
        if(id.error) throw id.error;
        var msg = new Message({
            client: this.client,
            channel: this,
            guild: this.guild,
            author: this.client.user
        });
        return new SentMessage({ id, message: msg });
    }
}

/**
 * Type of invoked event
 */
enum EventType {
    NewMessage
}

/**
 * Holds event data
 */
class Event {
    client: Client;
    type: EventType;

    constructor({
        client,
        type
    }: {
        client: Client,
        type: EventType
    }) {
        this.client = client;
        this.type = type;
    }
}

class NewMessageEvent extends Event {
    type = EventType.NewMessage;

    message: Message;
    guild: Guild;
    channel: Channel;
    author: User;

    constructor({
        message,
        client,
        channel,
        guild,
        author
    }: {
        message: Message,
        client: Client,
        channel: Channel,
        guild: Guild,
        author: User
    }) {
        super({ client, type: EventType.NewMessage});
        this.message = message;
        this.channel = channel;
        this.guild = guild;
        this.author = author;
    }
}

/**
 * Holds message data
 */
class Message {
    client: Client;
    channel: Channel;
    guild: Guild;
    author: User;

    constructor({
        client,
        channel,
        guild,
        author
    }: {
        client: Client,
        channel: Channel,
        guild: Guild,
        author: User
    }) {
        this.client = client;
        this.channel = channel;
        this.guild = guild;
        this.author = author;
    }

    reply(content: string | Embed): Promise<SentMessage> {
        return this.channel.send(content);
    }
}

/**
 * Holds sent message data
 */
class SentMessage {
    id: string;
    message: Message;

    constructor({
        id,
        message
    }: {
        id: string,
        message: Message
    }) {
        this.id = id;
        this.message = message;
    }

//    edit(content: string | Embed): Promise<void> {}
//    delete(): Promise<void> {}
}

/**
 * Holds guild data
 */
class Guild {
    client: Client;
    id: string;

    name: string;
    userCount: number;

    constructor({
        client,
        id,
        name,
        userCount
    }: {
        client: Client,
        id: string,
        name: string,
        userCount: number
    }) {
        this.client = client;
        this.id = id;
        this.name = name;
        this.userCount = userCount;
    }

    static async getGuild(id: string, client: Client): Promise<Guild> {
        var data = await makeRequest("guild/" + id);
        data.client = client;
        data.userCount = data.memberCount;
        return new Guild(data)
    }
}

class EmbedField {
    title: string;
    content: string;
    inline: boolean;

    constructor({
        title,
        content,
        inline
    }: {
        title: string,
        content: string,
        inline: boolean
    }) {
        this.title = title;
        this.content = content;
        this.inline = inline
    }
}

class EmbedFooter {
    text: string;
    icon: string;

    constructor({
        text,
        icon
    }: {
        text: string,
        icon: string
    }) {
        this.text = text;
        this.icon = icon;
    }
}

class EmbedAuthor {
    url: string;
    icon: string;
    text: string;

    constructor({
        url,
        text,
        icon
    }: {
        url: string,
        text: string,
        icon: string
    }) {
        this.url = url;
        this.text = text;
        this.icon = icon;
    }
}

/**
 * Holds embed data
 */
class Embed {
    title: string = "";
    description: string = "";

    author?: EmbedAuthor;

    fields?: EmbedField[];

    footer?: EmbedFooter;
    color?: string;

    setTitle(title: string): Embed {
        this.title = title;

        return this;
    }

    setDescription(description: string): Embed {
        this.description = description;

        return this;
    }

    setAuthor(text: string, icon: string, url: string): Embed;
    setAuthor(data: EmbedAuthor): Embed;
    
    setAuthor(data: string | EmbedAuthor, icon?: string, url?: string): Embed {
        if(typeof data === "string" && typeof icon === "string" && typeof url === "string") {
            this.author = new EmbedAuthor({ text: data, icon, url });
        } else if(data instanceof EmbedAuthor) {
            this.author = data;
        }

        return this;
    }

    addField(title: string, content: string, inline: boolean = false): Embed {
        if(!this.fields) this.fields = [];
        this.fields.push(new EmbedField({ title, content, inline }));

        return this;
    }

    addFields(fields: EmbedField[]) {
        if(this.fields) {
            this.fields.push(...fields);
        } else {
            this.fields = fields;
        }
        return this;
    }

    setColor(color: string) {
        this.color = color;
    }
}

/**
 * Holds user data
 */
class User {
    client: Client;
    id: string;

    bot: boolean;

    name: string;
    nickname: string;
    tag: string;
    identifier: number;
    avatar: string;

    constructor({
        client,
        id,
        bot,
        name,
        nickname,
        tag,
        identifier,
        avatar
    }: {
        client: Client,
        id: string,
        bot: boolean,
        name: string,
        nickname: string,
        tag: string,
        identifier: number,
        avatar: string
    }) {
        this.client = client;
        this.id = id;
        this.bot = bot;
        this.name = name;
        this.nickname = nickname;
        this.tag = tag;
        this.identifier = identifier;
        this.avatar = avatar;
    }

    static async getUser(id: string, client: Client): Promise<User> {
        if(!client.guild) throw new Error("Cannot use client before it's available");
        const member = await makeRequest("member/" + client.guild.id + "/" + id);
        const user = await makeRequest("user/" + id);

        var u = new User({
            client,
            id,
            bot: user.bot,
            name: user.username,
            nickname: member.nickname,
            tag: user.tag,
            identifier: user.discriminator,
            avatar: user.avatar_url
        });
        return u;
    }

//    ban(reason: string, days: number): Promise<void> {}
//    kick(reason: string): Promise<void> {}
//    warn(reason: string): Promise<void> {}
//
//    DM(message: string | Embed): Promise<void> {}
}

export {
    Client,
    Channel,
    EventType,
    Event,
    NewMessageEvent,
    Message,
    SentMessage,
    Guild,
    EmbedField,
    EmbedFooter,
    EmbedAuthor,
    Embed,
    User
};
