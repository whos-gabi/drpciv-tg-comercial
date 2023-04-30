import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import fs from "fs";
//fauna db
import { SubscriptionLayer } from "./faunadb.js";
const subsLayer = new SubscriptionLayer();

let timer = null;

//get all judete from judete.JSON

const judete = JSON.parse(fs.readFileSync("./judete.json", "utf8"));


function appointmentChecker() {
  console.log("✅ checking for appointments...");
  timer = setInterval(async () => {
    await subsLayer.getAllUsers().then((users) => {
      users.forEach(async (user) => {
        console.log(
          "loop over user: ",
          user.data.chat.id,
          "Judet: ",
          judete[user.data.judetId - 1].nume
        );
        //TODO: validate user free trial
        await subsLayer.getDateDRPCIV(user.data.judetId).then(async (date) => {
          // console.log(
          //   "fetched date: " + date + " last date: " + user.data.lastDate
          // );
          if (date !== user.data.lastDate) {
            console.log("new date found: " + date);
            await subsLayer
              .updateUserLastDate(user.data.chat.id, date)
              .then(async () => {
                await sendMessage(user.data.chat.id, date);
              });
          }
        });
      });
    });
  }, 60 * 1000 * 1); // 1 min
}

async function sendMessage(chatId, date) {
  const url = `https://api.telegram.org/bot${process.env.TOKEN}/sendMessage?chat_id=${chatId}&text=${date}+este+noua+data+disponibila+la+DRPCIV `;
  try {
    const { data } = await axios.post(url);
    console.log("texted user: ", data.ok);
  } catch (err) {
    console.log(err);
  }
}

appointmentChecker();
