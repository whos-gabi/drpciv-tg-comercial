import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
//fauna db
import { SubscriptionLayer } from "./faunadb.js";

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

const subsLayer = new SubscriptionLayer();

const judete = JSON.parse(fs.readFileSync("./judete.json", "utf8"));
let judet_id = 0;
let current_date = "";

bot.setMyCommands([
  { command: "/start", description: "Start 🚀" },
  { command: "/stop", description: "Stop ⛔️" },
  { command: "/judet", description: "Schimbă Județul ⚙️" },
  { command: "/help", description: "Ajutor ⁉" },
  { command: "/date", description: "Urmatoarea data disponibila 📆⏳" },
]);

const options1 = {
  reply_markup: JSON.stringify({
    inline_keyboard: judete.map((judet) => {
      return [{ text: judet.nume, callback_data: judet.id }];
    }),
  }),
};

//------------------BOT COMMANDS------------------

bot.on("message", async (msg) => {
  console.log(msg);
  const message = msg.text;
  const chatId = msg.chat.id;
  if (message === "/start") {
    //---------------------------------------- Start

    await subsLayer.getUser(msg.chat.id).then(async (user) => {
      if (user) {
        // await subsLayer.stopUser(msg.chat.id, false);
        if (subsLayer.validateUserTrial(user)) {
          if (user.archived) {
            //unarchive user
            bot.sendMessage(chatId, "Sesiunea dvs. este repornita. 🚀");
            await subsLayer.archiveUser(msg.chat.id, false);
          } else {
            //user already exists
            current_date = await subsLayer.getDateDRPCIV(user.judetId);
            bot.sendMessage(
              chatId,
              "Bot-ul deja ruleaza! (" + judete[user.judetId - 1].nume + ")"
            );
            bot.sendMessage(chatId, `Data curenta este: ${current_date}`);
          }
        }else{
          bot.sendMessage(chatId, "Abonamentul dvs. a expirat.😥\nPentru a continua să primiți notificări, va rugăm sa achitați abonamentul");
        }

      } else {
        bot.sendMessage(chatId, "Salut! 👋");
        bot.sendMessage(chatId, "Alegeți județul 🇷🇴", options1);
      }
    });
  } else if (message === "/help") {
    //---------------------------------------- Help ⁉
    bot.sendMessage(
      chatId,
      "Comenzile disponibile sunt: /start, /stop, /judet, /help, /date\n Pentru mai multe întrebări, contactați @whos_gabi sau https://wa.me/40730792946"
    );
  } else if (message === "/date") {
    //---------------------------------------- Date 📆⏳
    await subsLayer.getUser(chatId).then(async (user) => {
      if (user) {
        if (!user.archived) {
          let data = await subsLayer.getDateDRPCIV(user.judetId);
          bot.sendMessage(chatId, "*" + data + "*", {
            parse_mode: "Markdown",
          });
        } else {
          bot.sendMessage(
            chatId,
            "Sesiunea dvs. este oprită 🤷‍♂️\nFolosiți /start pentru a o porni din nou."
          );
        }
      } else {
        bot.sendMessage(
          chatId,
          "Nu sunteți abonat la notificări! \nFolosiți /start pentru a vă abona."
        );
      }
    });
  } else if (message === "/judet") {
    //---------------------------------------- Date 📆⏳
    await subsLayer.getUser(chatId).then(async (user) => {
      if (user) {
        if (!user.archived) {
          bot.sendMessage(chatId, "Schimbați județul 🇷🇴", options1);
        } else {
          bot.sendMessage(
            chatId,
            "Sesiunea dvs. este oprita 🤷‍♂️\nFolosiți /start pentru a o porni din nou."
          );
        }
      } else {
        bot.sendMessage(
          chatId,
          "Nu sunteți abonat la notificări! \nFolosiți /start pentru a vă abona."
        );
      }
    });
  } else if (message === "/stop") {
    //---------------------------------------- Stop ⛔️
    await subsLayer.archiveUser(msg.chat.id, true).then(async () => {
      bot.sendMessage(chatId, "Sesiunea dvs. a fost oprită");
      await subsLayer.sendMessage(
        process.env.ADMIN_CHAT_ID,
        `User stopped (/stop):\n\n${JSON.stringify(msg, null, 2)}`
      );
    });

    //---------------------------------------- ADMIN COMMANDS
  } else if (message === "/users" && chatId == process.env.ADMIN_CHAT_ID) {
    //---------------------------------------- Users 🦀
    await subsLayer.getAllUsers().then((users) => {
      users.forEach((user) => {
        bot.sendMessage(
          chatId,
          `User: ${JSON.stringify(user.data.chat, null, 2)}\nJudet: ${
            judete[user.data.judetId - 1].nume
          }\nArchived: ${user.data.archived}\nSubscribed: ${
            user.data.subscribed
          }\nFreeTrial:\n ${JSON.stringify(user.data.freetrial, null, 2)}\n`
        );
      });
    });
  } else {
    //---------------------------------------- Invalid command ♿️🚫
    bot.sendMessage(
      chatId,
      "Se pare că acest mesaj nu este o comandă validă. Încercați /help."
    );
  }
});

// Option callback
bot.on("callback_query", async (callbackQuery) => {
  const action = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const message = callbackQuery.message.text;
  try {
    judet_id = action;
    // console.log(judet_id);
    bot.sendMessage(chatId, `Ați ales județul ${judete[judet_id - 1].nume}`);

    //optional
    current_date = await subsLayer.getDateDRPCIV(judet_id);
    //-----

    if (message === "Alegeți județul 🇷🇴") {
      bot.deleteMessage(chatId, messageId);
      subsLayer
        .addUser(callbackQuery.message.chat, current_date, judet_id)
        .then(async (user) => {
          bot.sendMessage(chatId, `Data curenta este: ${current_date}`);
          bot.sendMessage(
            chatId,
            "O să vă anunțăm despre programările disponibile la DRPCIV"
          );
          await subsLayer.sendMessage(
            process.env.ADMIN_CHAT_ID,
            `New user subscribed: ${chatId} Judet: ${
              judete[judet_id - 1].nume
            }\n\n${JSON.stringify(user, null, 2)}`
          );
        });
    } else if (message === "Schimbați județul 🇷🇴") {
      bot.deleteMessage(chatId, messageId);
      await subsLayer.updateUserLastDate(chatId, current_date);
      subsLayer.updateUserJudetID(chatId, judet_id).then(async () => {
        bot.sendMessage(chatId, `Data curentă este: ${current_date}`);
        bot.sendMessage(
          chatId,
          "Vă ținem la curent cu programările disponibile la DRPCIV"
        );
        await subsLayer.sendMessage(
          process.env.ADMIN_CHAT_ID,
          `User: ${chatId} changed to Judet: ${judete[judet_id - 1].nume}`
        );
      });
    }
  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, `Eroare: ${err}`);
  }
});

//--------------------FUNCTIONS----------------------
