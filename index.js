import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
//fauna db
import { SubscriptionLayer } from "./faunadb.js";

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

const subsLayer = new SubscriptionLayer();

const BASE_URL =
  "https://www.drpciv.ro/drpciv-booking-api/getAvailableDaysForSpecificService/1/";

const months = [
  "",
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

const judete = [
  { id: 1, nume: "Alba" },
  { id: 2, nume: "Arad" },
  { id: 3, nume: "Arges" },
  { id: 4, nume: "Bacau" },
  { id: 5, nume: "Bihor" },
  { id: 6, nume: "Bistrita-Nasaud" },
  { id: 7, nume: "Botosani" },
  { id: 8, nume: "Brasov" },
  { id: 9, nume: "Braila" },
  { id: 10, nume: "Buzau" },
  { id: 11, nume: "Caras-Severin" },
  { id: 12, nume: "Cluj" },
  { id: 13, nume: "Constanta" },
  { id: 14, nume: "Covasna" },
  { id: 15, nume: "Dambovita" },
  { id: 16, nume: "Dolj" },
  { id: 17, nume: "Galati" },
  { id: 18, nume: "Gorj" },
  { id: 19, nume: "Harghita" },
  { id: 20, nume: "Hunedoara" },
  { id: 21, nume: "Ialomita" },
  { id: 22, nume: "Iasi" },
  { id: 23, nume: "Ilfov" },
  { id: 24, nume: "Maramures" },
  { id: 25, nume: "Mehedinti" },
  { id: 26, nume: "Mures" },
  { id: 27, nume: "Neamt" },
  { id: 28, nume: "Olt" },
  { id: 29, nume: "Prahova" },
  { id: 30, nume: "Satu Mare" },
  { id: 31, nume: "Salaj" },
  { id: 32, nume: "Sibiu" },
  { id: 33, nume: "Suceava" },
  { id: 34, nume: "Teleorman" },
  { id: 35, nume: "Timis" },
  { id: 36, nume: "Tulcea" },
  { id: 37, nume: "Vaslui" },
  { id: 38, nume: "Valcea" },
  { id: 39, nume: "Vrancea" },
  { id: 40, nume: "Bucuresti" },
  { id: 41, nume: "Bucuresti S.1" },
  { id: 42, nume: "Bucuresti S.2" },
  { id: 43, nume: "Bucuresti S.3" },
  { id: 44, nume: "Bucuresti S.4" },
  { id: 45, nume: "Bucuresti S.5" },
  { id: 46, nume: "Bucuresti S.6" },
];

let judet_id = 0;
let timer = null;
let current_date = "";

bot.setMyCommands([
  { command: "/start", description: "Start 🚀" },
  { command: "/stop", description: "Stop ⛔️" },
  { command: "/help", description: "Ajutor ⁉" },
  { command: "/date", description: "Urmatoarea data disponibila 📆⏳" },
]);

//loop all users and ebash message to all of them
appointmentChecker();



//------------------BOT COMMANDS------------------

bot.on("message", async (msg) => {
  console.log(msg);
  const message = msg.text;
  const chatId = msg.chat.id;
  const options1 = {
    reply_markup: JSON.stringify({
      inline_keyboard: judete.map((judet) => {
        return [{ text: judet.nume, callback_data: judet.id }];
      }),
    }),
  };

  if (message === "/start") {
    //---------------------------------------- Start
    clearInterval(timer);
    timer = null;
    current_date = "";
    //check is user exists in db
    await subsLayer.getAllUsers(msg).then((users) => {
      //loop users
      console.log(users);
      if (users.length > 0) {
        users.forEach((user) => {
          //check if user exists in db
          if (user.data.chat?.id == msg.chat.id) {
            console.log(`User ${msg.chat.id} already exists in db`);
            // loop already started for this user MSG
          } else {
            bot.sendMessage(chatId, "Salut! 👋");
            bot.sendMessage(chatId, "Alege judetul 🇷🇴", options1);
          }
        });
      } else {
        bot.sendMessage(chatId, "Salut! 👋");
        bot.sendMessage(chatId, "Alege judetul 🇷🇴", options1);
      }
    });

    // //sterge nahui toti userii
    // await subsLayer.getAllUsers().then((users) => {
    //   if (users.length > 0) {
    //     subsLayer
    //       .deleteAllUsers()
    //       .then((resp) => {
    //         console.log(`Deleted ${resp.length} users.`)
    //         subsLayer.addUser(msg).then(() => console.log("newUser"));
    //       });
    //   } else {
    //     subsLayer.addUser(msg).then(() => console.log("newUser"));
    //   }
    // });

    console.log(msg.text); //test
    // bot.sendMessage(
    //   chatId,
    //   "Hey, o sa va anuntam despre programarile disponibile la DRPCIV"
    // );
    // current_date = await getDateDRPCIV(msg);
    // bot.sendMessage(chatId, `Data curenta este: ${current_date}`);
    // appointmentChecker(msg);
    // console.log(`Data curenta este: ${current_date}`);
  } else if (message === "/help") {
    //---------------------------------------- Help ⁉
    bot.sendMessage(
      chatId,
      "Comenzile disponibile sunt: /start, /stop, /help, /date"
    );
  } else if (message === "/date") {
    //---------------------------------------- Date 📆⏳
    let data = await getDateDRPCIV();
    bot.sendMessage(chatId, "*" + data + "*", {
      parse_mode: "Markdown",
    });
    console.log("/date: " + data);
  } else if (message === "/stop") {
    //---------------------------------------- Stop ⛔️
    clearInterval(timer);
    timer = null;
    current_date = "";
    //sterge nahui toti userii
    subsLayer
      .deleteAllUsers()
      .then((deletedUsers) =>
        console.log(`Deleted ${deletedUsers.length} users.`)
      );
    bot.sendMessage(chatId, "Botul a fost oprit");
  } else {
    //---------------------------------------- Invalid command ♿️🚫
    bot.sendMessage(
      chatId,
      "Se pare ca acest mesaj nu este o comanda valida. Incearca /help."
    );
  }

  //dupa toate huinelele...

  if (current_date != "") {
    // appointmentChecker(msg);
  }
});

// Option callback
bot.on("callback_query", async (callbackQuery) => {
  const action = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    judet_id = action;
    console.log(judet_id);
    bot.sendMessage(chatId, `Ai ales judetul ${judete[judet_id - 1].nume}`);

    //optional
    current_date = await getDateDRPCIV(judet_id);
    bot.sendMessage(chatId, `Data curenta este: ${current_date}`);
    //-----

    // appointmentChecker(chatId, judet_id);
    bot.deleteMessage(chatId, messageId);

    subsLayer
      .addUser(callbackQuery.message.chat, current_date, judet_id)
      .then(() => console.log("newUser"));
  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, `Eroare: ${err}`);
  }
});

//--------------------FUNCTIONS----------------------

function appointmentChecker() {
  console.log("✅ checking for appointments...");
  timer = setInterval(async () => {
    await getAllUsers().then((users) => {
      users.forEach(async (user) => {
        let date = await getDateDRPCIV(user.data.judetId);
        if (date !== user.data.lastdate) {
          console.log("new date found: " + date);
          subsLayer.updateUser(user.data.chat.id, date);
          bot.sendMessage(
            user.data.chat.id,
            `${date} este noua data disponibila la DRPCIV `
          );
        } 
      });
    });
  }, 60 * 1000 * 1); // 1 min
}

async function getDateDRPCIV(judetId) {
  let first_date = "";
  return new Promise((resolve) => {
    axios
      .get(BASE_URL + judetId)
      .then((data) => {
        first_date = data.data[0].split(" ")[0];
        first_date = first_date.split("-");
        first_date =
          first_date[2] +
          " " +
          months[parseInt(first_date[1])] +
          " " +
          first_date[0];
        setTimeout(() => {
          resolve(String(first_date));
        }, 500);
      })
      .catch((error) => {
        console.log(error);
      });
  });
}
