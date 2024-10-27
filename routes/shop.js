const router = require("express").Router();

let connectDB = require("./../database.js");

let db;
connectDB
  .then((client) => {
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

router.get("/shirts", async (req, resp) => {
  let results = await db.collection("post").find().toArray();
  //   console.log(results);
  resp.send("셔츠를 파는 페이지입니다.");
});

router.get("/pants", (req, resp) => {
  resp.send("바지를 파는 페이지입니다.");
});

module.exports = router;
