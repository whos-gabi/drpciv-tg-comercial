import { default as faunadb } from "faunadb";
import axios from "axios";

export class SubscriptionLayer {
  client;

  constructor() {
    this.client = new faunadb.Client({ secret: process.env.FAUNA_KEY });
    this.collection = "subscribers";
    this.index = "chatId";
    // this.collection = "test-env";
    // this.index = "dev-chatId";

    this.q = faunadb.query;
    this.months = [
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
    // this.BASE_URL =
    //   "https://4b68f4d8-0a7c-4ae0-a2f9-fb6ab154dbfa.mock.pstmn.io/mock/";
    this.BASE_URL =
      "https://www.drpciv.ro/drpciv-booking-api/getAvailableDaysForSpecificService/1/";
  }

  async getAllUsers() {
    try {
      const result = await this.client.query(
        faunadb.query.Map(
          faunadb.query.Paginate(
            faunadb.query.Documents(faunadb.query.Collection(this.collection))
          ),
          faunadb.query.Lambda((x) => faunadb.query.Get(x))
        )
      );
      return result.data;
    } catch (error) {
      console.log("Error retrieving users: " + error);
    }
  }

  async addUser(chat, lastDate, judetId) {
    try {
      //create a date instance 3 days from now
      let date = new Date();
      date.setDate(date.getDate() + 3);
      //strinfify date
      date = date.toISOString();

      const user = {
        chat: chat,
        lastDate: lastDate,
        judetId: judetId,
        archived: false,
        subscribed: false,
        freetrial: {
          status: true,
          endtime: date,
        },
      };
      await this.client.query(
        faunadb.query.Create(faunadb.query.Collection(this.collection), {
          data: user,
        })
      );
      return user;
    } catch (error) {
      console.log("Error: ", error);
    }
  }

  async deleteUser(userRef) {
    try {
      const result = await this.client.query(faunadb.query.Delete(userRef));
      return result.ref.data;
    } catch (error) {
      console.error(`Error updating user document: ${error}`);
    }
  }

  async updateUserLastDate(chatId, lastDate) {
    try {
      const user = await this.client.query(
        this.q.Get(this.q.Match(this.q.Index(this.index), chatId))
      );
      if (user) {
        await this.client.query(
          this.q.Update(user.ref, { data: { lastDate: lastDate } })
        );
        console.log(`User with chatId ${chatId} updated successfully`);
      } else {
        console.log(`User with chatId ${chatId} not found`);
      }
    } catch (error) {
      console.error(`Error updating user document: ${error}`);
    }
  }
  async updateUserJudetID(chatId, judetId) {
    try {
      const user = await this.client.query(
        this.q.Get(this.q.Match(this.q.Index(this.index), chatId))
      );
      if (user) {
        await this.client.query(
          this.q.Update(user.ref, { data: { judetId: judetId } })
        );
        console.log(`User with chatId ${chatId} updated successfully`);
      } else {
        console.log(`User with chatId ${chatId} not found`);
      }
    } catch (error) {
      console.error(`Error updating user document: ${error}`);
    }
  }

  async updateUserSubscription(chatId, status) {
    //use this for admin use only
    try {
      const user = await this.client.query(
        this.q.Get(this.q.Match(this.q.Index(this.index), chatId))
      );
      if (user) {
        await this.client.query(
          this.q.Update(user.ref, { data: { subscribed: status } })
        );
        console.log(
          `User with chatId ${chatId} updated successfully (SUBSCRIPTION)`
        );
      } else {
        console.log(`User with chatId ${chatId} not found`);
      }
    } catch (error) {
      console.error(`Error updating user document: ${error}`);
    }
  }

  async updateUserTrial(chatId, status) {
    try {
      const user = await this.client.query(
        this.q.Get(this.q.Match(this.q.Index(this.index), chatId))
      );
      if (user) {
        await this.client.query(
          this.q.Update(user.ref, { data: { freetrial: { status: status } } })
        );
        console.log(
          `User with chatId ${chatId} updated successfully (FreeTrial)`
        );
      } else {
        console.log(`User with chatId ${chatId} not found`);
      }
    } catch (error) {
      console.error(`Error updating user document: ${error}`);
    }
  }

  async archiveUser(chatId, status) {
    try {
      const user = await this.client.query(
        this.q.Get(this.q.Match(this.q.Index(this.index), chatId))
      );
      if (user) {
        await this.client.query(
          this.q.Update(user.ref, { data: { archived: status } })
        );
        console.log(`User with chatId ${chatId} stopped successfully`);
      } else {
        console.log(`User with chatId ${chatId} not found`);
      }
    } catch (error) {
      console.error(`Error updating user document: ${error}`);
    }
  }

  async deleteUser(chatId) {
    try {
      const { ref } = await this.client.query(
        this.q.Let(
          { userRef: this.q.Match(this.q.Index(this.index), chatId) },
          this.q.Delete(this.q.Select("ref", this.q.Get(this.q.Var("userRef"))))
        )
      );
      console.log(`User with chat ID ${chatId} deleted successfully`);
    } catch (error) {
      console.log(`Error deleting user with chat ID ${chatId}: `, error);
    }
  }

  async getUser(chatId) {
    try {
      let resp;
      await this.getAllUsers().then((users) => {
        if (users.length > 0) {
          users.forEach((user) => {
            if (user.data.chat?.id == chatId) {
              resp = user.data;
            }
          });
        }
      });
      return resp;
    } catch (error) {
      console.log("Error: ", error);
    }
  }

  async getDateDRPCIV(judetId) {
    try {
      const response = await axios.get(`${this.BASE_URL}${judetId}`);
      const firstDateParts = response.data[0].split(" ")[0].split("-");
      const year = firstDateParts[0];
      const monthIndex = parseInt(firstDateParts[1]);
      const day = firstDateParts[2];
  
      const formattedDate =
        day +
        " " +
        this.months[monthIndex] +
        " " +
        year;
  
      return formattedDate;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
  
  
  validateUserTrial(user) {
    if (user.freetrial.status) {
      return new Date(user.freetrial.endtime) > Date.now();
    }
    return user.subscribed;
  }

  async sendMessage(chatId, msg) {
    msg = encodeURI(msg);
    const url = `https://api.telegram.org/bot${process.env.TOKEN}/sendMessage?chat_id=${chatId}&text=${msg}`;
    try {
      const { data } = await axios.post(url);
    } catch (err) {
      console.log(err);
    }
  }

  //end class
}
