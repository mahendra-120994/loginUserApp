const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/register", async (req, res) => {
  const { username, name, password, gender, location } = req.body;

  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    if (password.length < 5) {
      res.status(400);
      res.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `
            INSERT INTO user (username, name, password, gender, location)
            VALUES
            (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            )`;
      await db.run(createUserQuery);
      res.status(200);
      res.send("User created successfully");
    }
  } else {
    res.status(400);
    res.send("User already exists");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;

  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    const isPasswordMatch = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatch === true) {
      res.status(200);
      res.send("Login success!");
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

app.put("/change-password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    const isPasswordMatch = await bcrypt.compare(oldPassword, dbUser.password);

    if (isPasswordMatch === true) {
      if (newPassword.length < 5) {
        res.status(400);
        res.send("Password is too short");
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updateUserPasswordQuery = `
            UPDATE user
            SET
            password='${hashedPassword}'
            WHERE username = '${username}'
            `;
        await db.run(updateUserPasswordQuery);
        res.status(200);
        res.send("Password updated");
      }
    } else {
      res.status(400);
      res.send("Invalid current password");
    }
  }
});

module.exports = app;
