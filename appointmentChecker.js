import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import fs from "fs";
//fauna db
import { SubscriptionLayer } from "./faunadb.js";
const subsLayer = new SubscriptionLayer();

let timer = null;

//get all judete from judete.JSON

// const judete = JSON.parse(fs.readFileSync("./judete.json", "utf8"));

function appointmentChecker() {
  console.log("✅ checking for appointments...");
  timer = setInterval(async () => {
    await subsLayer.getAllUsers().then((users) => {
      users.forEach(async (user) => {
        // console.log(
        //   "loop over user: ",
        //   user.data.chat.id,
        //   "Judet: ",
        //   judete[user.data.judetId - 1].nume
        // );
        if (!user.data.archived) {
          //validate user free trial
          if (subsLayer.validateUserTrial(user.data)) {
            await subsLayer
              .getDateDRPCIV(user.data.judetId)
              .then(async (date) => {
                // console.log(
                //   "fetched date: " + date + " last date: " + user.data.lastDate
                // );
                if (date !== user.data.lastDate) {
                  // console.log("new date found: " + date);
                  await subsLayer
                    .updateUserLastDate(user.data.chat.id, date)
                    .then(async () => {
                      await subsLayer.sendMessage(
                        user.data.chat.id,
                        `${date} este noua data disponibila la DRPCIV`
                      );
                    });
                }
              });
          } else {
            try {
              await subsLayer.sendMessage(
                process.env.ADMIN_CHAT_ID,
                `User ${user.data.chat.id} expired trial\n\n${JSON.stringify(
                  user.data,
                  null,
                  2
                )}`
              );
              await subsLayer.sendMessage(
                user.data.chat.id,
                `Abonamentul dvs. a expirat.😥\nPentru a continua sa primiti notificari, va rugam sa achitati abonamentul`
              );
              await subsLayer.archiveUser(user.data.chat.id, true);
              await subsLayer.updateUserTrial(user.data.chat.id, false);
            } catch (err) {
              console.log(err);
            }
          }
        }

      });
    });
  }, 60 * 1000 * 1); // 1 min
}

appointmentChecker();
