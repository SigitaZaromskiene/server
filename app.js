const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const mysql = require("mysql");
const { v4: uuidv4 } = require("uuid");
const md5 = require("md5");

const app = express();
const port = 3003;
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "fundme",
});

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(express.json());

// LOGIN/LOGOUT

app.post("/login", (req, res) => {
  const sessionId = uuidv4();

  const sql = `
        UPDATE login
        SET session = ?
        WHERE name = ? AND psw = ?
    `;

  con.query(
    sql,
    [sessionId, req.body.name, md5(req.body.psw)],
    (err, result) => {
      if (err) throw err;
      if (result.affectedRows) {
        res.cookie("fundsCookie", sessionId);
        res.json({
          status: "ok",
          name: req.body.name,
        });
      } else {
        res.json({
          status: "error",
        });
      }
    }
  );
});

app.get("/login", (req, res) => {
  const sql = `
        SELECT name, role
        FROM login
        WHERE session = ?
    `;
  con.query(sql, [req.cookies.fundsCookie || ""], (err, result) => {
    if (err) throw err;

    if (result.length) {
      res.json({
        status: "ok",
        name: result[0].name,
        role: result[0].role,
      });
    } else {
      res.json({
        status: "error",
      });
    }
  });
});

app.post("/logout", (req, res) => {
  res.cookie("fundsCookie", "", { maxAge: -3600 });
  res.json({
    status: "logout",
  });
});

// REGISTER

app.post("/register", (req, res) => {
  const sessionId = uuidv4();
  // const manager = "manager";

  const sql = `
        INSERT INTO login ( name, psw, session, role)
        VALUES (?, ?, ?, ?)

        `;
  con.query(
    sql,
    [req.body.name, md5(req.body.psw), sessionId, "manager"],
    (err, result) => {
      if (result) {
        res.cookie("fundsCookie", sessionId);
        res.json({
          status: "ok",
          name: req.body.name,
          role: req.body.role,
        });
      } else {
        res.json({
          status: "error",
        });
      }
    }
  );
});

app.get("/projects", (req, res) => {
  const sql = `
        SELECT id, text, amount, image, raised, donatorName, donatorAmount, blocked
        FROM form
        ORDER BY amount-raised DESC
        
    
    `;
  con.query(sql, (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

app.delete("/projects/:id", (req, res) => {
  const sql = `
       DELETE FROM form
       WHERE id = ?
    `;
  con.query(sql, [req.params.id], (err) => {
    if (err) throw err;
    res.json({});
  });
});

// app.post("/projects", (req, res) => {
//   const sql = `
//         INSERT login VALUES( id, name, psw, session)
//         VALUES (?, ?, ?)
//     `;
//   con.query(sql, [req.body.name, md5(req.body.psw), sessionId], (err) => {
//     if (err) throw err;
//     res.json({});
//   });
// });
//   let allData = fs.readFileSync("./data/users.json", "utf8");
//   allData = JSON.parse(allData);
//   const id = uuidv4();
//   const data = {
//     role: "manager",
//     name: req.body.name,
//     psw: md5(req.body.psw),
//     id,
//   };
//   allData.push(data);
//   allData = JSON.stringify(allData);
//   fs.writeFileSync("./data/users.json", allData, "utf8");
//   res.json({
//     status: "ok",
//   });

// AUTORIZACIJA

// const doAuth = function (req, res, next) {
//   if (req.url.indexOf("/projects") === 0) {
//     const users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));
//     const user = req.cookies.fundsCookie
//       ? users.find((u) => u.session === req.cookies.fundsCookie)
//       : null;

//     if ((user && user.role === "admin") || user.role === "manager") {
//       next();
//     } else {
//       res.status(401).json({});
//     }
//   }

//   if (req.url.indexOf("/story") === 0) {
//     const users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));
//     const user = req.cookies.fundsCookie
//       ? users.find((u) => u.session === req.cookies.fundsCookie)
//       : null;
//     if (user && user.role === "manager") {
//       next();
//     } else {
//       res.status(401).json({});
//     }
//   }
// };

// else if (req.url.indexOf("/users") === 0) {
//   const users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));
//   const user = req.cookies.fundsCookie
//     ? users.find((u) => u.session === req.cookies.fundsCookie)
//     : null;
//   if (user && user.role === "admin") {
//     next();
//   } else {
//     res.status(401).json({});
//   }
// } else {
//   next();
//   // }
// };

// app.use(doAuth);
// //

// app.get("/donations", (req, res) => {
//   const sql = `
//         SELECT name, amount, id
//         FROM donations

//     `;
//   con.query(sql, (err, result) => {
//     if (err) throw err;
//     res.json(result);
//   });
// });
// FORM

// app.post("/story", (req, res) => {
//   const sql = `
//         INSERT INTO form (text, amount, image)
//         VALUES (?, ?, ?)
//     `;
//   con.query(sql, [req.body.text, req.body.amount, fileName], (err) => {
//     if (err) throw err;
//     res.json({});
//   });
// });

// FOTO

app.post("/story", (req, res) => {
  let fileName = null;

  if (req.body.file !== null) {
    let type = "unknown";
    let file;

    if (req.body.file.indexOf("data:image/png;base64,") === 0) {
      type = "png";
      file = Buffer.from(
        req.body.file.replace("data:image/png;base64,", ""),
        "base64"
      );
    } else if (req.body.file.indexOf("data:image/jpeg;base64,") === 0) {
      type = "jpg";
      file = Buffer.from(
        req.body.file.replace("data:image/jpeg;base64,", ""),
        "base64"
      );
    } else {
      file = Buffer.from(req.body.file, "base64");
    }

    fileName = uuidv4() + "." + type;

    fs.writeFileSync("./public/img/" + fileName, file);
  }

  const sql = `
        INSERT INTO form (text, amount, raised, image)
        VALUES (?, ?, ?, ?)
    `;
  con.query(
    sql,
    [req.body.text, req.body.amount, req.body.raised, fileName],
    (err) => {
      if (err) throw err;
      res.json({});
    }
  );
});

app.post("/donations", (req, res) => {
  const sql = `
        INSERT INTO donations (name, amount, projectId)
        VALUES (?, ?, ?)
    `;
  con.query(
    sql,
    [req.body.name, req.body.amount, req.body.projectId],
    (err) => {
      if (err) throw err;
      res.json({});
    }
  );
});

app.get("/donations", (req, res) => {
  const sql = `SELECT * FROM donations`;

  con.query(sql, (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

app.put("/projects/:id/block", (req, res) => {
  const sql = `
        UPDATE form
        SET blocked = ?
        WHERE id = ?
    `;
  con.query(sql, [req.body.blocked, req.params.id], (err) => {
    if (err) throw err;
    res.json({});
  });
});

// app.post("/projects", (req, res) => {
//   const sql = `
//         INSERT INTO donations (name, amount)
//         VALUES (?, ?)
//     `;
//   con.query(sql, [req.body.name, req.body.amount], (err) => {
//     if (err) throw err;
//     res.json({});
//   });
// });

app.put("/projects/:id", (req, res) => {
  const sql = `
      UPDATE form
      SET raised = ?, donatorName = ?, donatorAmount = ?
      WHERE id = ?
  `;
  con.query(
    sql,
    [
      req.body.raised,
      req.body.donatorName,
      req.body.donatorAmount,
      req.params.id,
    ],
    (err) => {
      if (err) throw err;
      res.json({});
    }
  );
});

//   const sql = `
//         INSERT INTO form (text, image, amount)
//         VALUES (?, ?, ?)
//     `;
//   con.query(sql, [req.body.text, fileName, req.body.amount], (err) => {
//     if (err) throw err;
//     res.json({});
//   });
// });

// app.post("/projects", (req, res) => {
//   const sql = `
//         INSERT INTO form (text, image, amount, raised, leftTill)
//         VALUES (?, ?, ?,?,?)
//     `;
//   con.query(
//     sql,
//     [
//       req.body.text,
//       fileName,
//       req.body.amount,
//       req.body.raised,
//       req.body.leftTill,
//     ],
//     (err) => {
//       if (err) throw err;
//       res.json({});
//     }
//   );
// });

app.listen(port, () => {
  console.log(`Bank is on port number: ${port}`);
});
