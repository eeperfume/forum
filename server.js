const express = require("express");
const app = express();
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");

app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
// app.set("views", __dirname + "views") // 기본값
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const MongoStore = require("connect-mongo");

app.use(passport.initialize());
app.use(
  session({
    secret: "암호화에 쓸 비번", // 세션 문자열을 암호화할 때 사용 (털리면 인생 끝남)
    resave: false, // 사용자가 요청을 보낼 때마다 세션 데이터를 갱신할 것인지 (false 추천)
    saveUninitialized: false, // 사용자가 로그인을 하지 않아도 세션을 저장할 것인지 (false 추천)
    cookie: { maxAge: 60 * 60 * 1000 }, // 1시간 유지
    store: MongoStore.create({
      mongoUrl:
        "mongodb+srv://admin:!1q2w3e4r@cluster0.midgb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", // DB 접속 URl
      dbName: "forum",
    }),
  })
);

app.use(passport.session());

const { MongoClient, ObjectId } = require("mongodb");

let db;
const url =
  "mongodb+srv://admin:!1q2w3e4r@cluster0.midgb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB 연결 성공");
    db = client.db("forum");
    app.listen(8080, () => {
      console.log("listening on 8080");
    });
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/pet", (req, resp) => {
  resp.send("펫 용품 쇼핑할 수 있는 페이지입니다.");
});

app.get("/beauty", (req, resp) => {
  resp.send("뷰티 용품 쇼핑할 수 있는 페이지입니다.");
});

app.get("/news", (req, resp) => {
  // db.collection('post').insertOne({ title: '어쩌구' });
  resp.send("오늘은 비가 올 수도 있습니다.");
});

app.get("/", (req, resp) => {
  resp.render("index.ejs");
});

app.get("/list", async (req, resp) => {
  let results = await db.collection("post").find().toArray();
  // console.log(results);
  // resp.send(results[0].title);
  // db.collection('post').find().toArray().then((results) => {
  //     console.log(results);
  //     resp.send('then');
  // });
  resp.render("list.ejs", { datas: results });
});

app.get("/time", (req, resp) => {
  resp.render("time.ejs", { data: new Date() });
});

app.get("/write", (req, resp) => {
  resp.render("write.ejs");
});

app.post("/add", async (req, resp) => {
  // console.log(req.body);
  try {
    if ("" == req.body.title) {
      return resp.send("제목이 입력되지 않았습니다.");
    }
    if ("" == req.body.content) {
      return resp.send("내용이 입력되지 않았습니다.");
    }
    // throw new Exception("강제로 예외를 발생시켰습니다.");
    let result = await db
      .collection("post")
      .insertOne({ title: req.body.title, content: req.body.content });
    resp.redirect("/list");
  } catch (e) {
    console.log(e);
    resp.status(500).send("서버에서 오류가 발생했습니다.");
  }
});

app.get("/detail/:id", async (req, resp) => {
  // console.log(req.params);
  try {
    let result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(req.params.id) });
    // console.log(result);
    if (result == null) {
      resp.status(404).send("존재하지 않는 페이지입니다.");
    }
    resp.render("detail.ejs", { data: result });
  } catch (e) {
    console.log(e);
    resp.status(404).send("존재하지 않는 페이지입니다.");
  }
});

app.get("/edit/:id", async (req, resp) => {
  // console.log(req.params);
  try {
    let result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(req.params.id) });
    // console.log(result);
    if (result == null) {
      resp.status(404).send("존재하지 않는 페이지입니다.");
    }
    resp.render("edit.ejs", { data: result });
  } catch (e) {
    console.log(e);
    resp.status(404).send("존재하지 않는 페이지입니다.");
  }
});

app.put("/edit", async (req, resp) => {
  // console.log(req.body);
  let result = await db
    .collection("post")
    .updateOne(
      { _id: new ObjectId(req.body.id) },
      { $set: { title: req.body.title, content: req.body.content } }
    );
  // console.log(result);
  resp.redirect("/list");
  // await db.collection("post").updateOne({ _id: 1 }, { $set: { like: 10 } }); // 덮어쓰기
  // await db.collection("post").updateOne({ _id: 1 }, { $inc: { like: -2 } }); // +-2
  // await db.collection("post").updateOne({ _id: 1 }, { $mul: { like: 2 } }); // x2
  // await db.collection("post").updateOne({ _id: 1 }, { $unset: { like: "" } }); // 필드 삭제
  // await db.collection("post").updateMany({ _id: 1 }, { $set: { like: 2 } }); // _id가 1인 데이터를 찾아서 like를 2로 덮어쓰기
  // await db
  //   .collection("post")
  //   .updateMany({ like: { $gt: 10 } }, { $set: { like: 2 } }); // like가 10 초과인 document 찾아서 전부 like를 2로 덮어쓰기 (like > 10)
  // await db
  //   .collection("post")
  //   .updateMany({ like: { $gte: 10 } }, { $set: { like: 2 } }); // like가 10 이상인 document 찾아서 전부 like를 2로 덮어쓰기 (like >= 10)
  // await db
  //   .collection("post")
  //   .updateMany({ like: { $lte: 10 } }, { $set: { like: 2 } }); // like가 10 이하인 document 찾아서 전부 like를 2로 덮어쓰기 (like <= 10)
  // await db
  //   .collection("post")
  //   .updateMany({ like: { $ne: 10 } }, { $set: { like: 2 } }); // like가 10이 아닌 document 찾아서 전부 like를 2로 덮어쓰기 (like != 10)
});

// app.get("/abc", async (req, resp) => {
//   console.log("abc");
// });

// URL parameter
app.get("/abc/:name/:age", async (req, resp) => {
  console.log("URL parameter");
  console.log(req.params);
});

// query string
app.get("/abc", async (req, resp) => {
  console.log("query string");
  console.log(req.query);
});

app.delete("/delete", async (req, resp) => {
  // console.log(req.query);
  await db.collection("post").deleteOne({ _id: new ObjectId(req.query.id) });
  resp.send("삭제를 완료했습니다.");
});

// app.get("/list/1", async (req, resp) => {
//   let results = await db.collection("post").find().limit(5).toArray();
//   resp.render("list.ejs", { datas: results });
// });

// app.get("/list/2", async (req, resp) => {
//   let results = await db.collection("post").find().skip(5).limit(5).toArray();
//   resp.render("list.ejs", { datas: results });
// });

// app.get("/list/3", async (req, resp) => {
//   let results = await db.collection("post").find().skip(10).limit(5).toArray();
//   resp.render("list.ejs", { datas: results });
// });

app.get("/list/:id", async (req, resp) => {
  let results = await db
    .collection("post")
    .find()
    .skip((req.params.id - 1) * 5)
    .limit(5)
    .toArray();
  resp.render("list.ejs", { datas: results });
});

app.get("/list/next/:id", async (req, resp) => {
  let results = await db
    .collection("post")
    .find({ _id: { $gt: new ObjectId(req.params.id) } })
    .limit(5)
    .toArray();
  resp.render("list.ejs", { datas: results });
});

app.get("/counter", async (req, resp) => {
  let result = await db.collection("counter").findOne();
  // console.log(`count: ${result.count}`);
  resp.send(`count: ${result.count}`);
});

passport.use(
  // 아이디/패스워드 외에 다른 것도 제출받아서 검증할 수 있음. passReqToCallback 옵션을 사용하면 됨.
  new LocalStrategy(async (username, password, callback) => {
    console.log(`username: ${username}, password: ${password}`);
    try {
      let result = await db.collection("user").findOne({ username: username });
      if (!result) {
        return callback(null, false, {
          message: "존재하지 않는 아이디입니다.",
        }); // 회원 인증 실패 시에 callback 함수 두 번째 인자에 false를 넣어줘야 함.
        // username: abc, password: 123
        // error: null, user: false, info: [object Object]
      }
      console.log(`result.password: ${result.password}`);

      return (await bcrypt.compare(password, result.password)) // 해시할 비번, 해시된 비번
        ? callback(null, result) // passport.serializeUser 함수의 user에서 꺼내쓸 수 있음.
        : callback(null, false, { message: "패스워드가 일치하지 않습니다." });
      // username: test, password: 123
      // result.password: 1234
      // error: null, user: false, info: [object Object]
    } catch (e) {
      console.log(e);
    }
  })
);

// passport.serializeUser ?
// 로그인 성공하면 세션 document를 만들어서 쿠키를 사용자에게 보내줘야 하는데,
// passport.serializeUser() 쓰면 자동임.
passport.serializeUser((user, done) => {
  // console.log(user);
  // process.nextTick ?
  // Node.js 환경에서 특정 코드를 비동기적으로 처리하고 싶을 때 쓰는 문법
  // 그래서 세션 만들고 이런 걸 비동기적으로 처리해 주려고 라이브러리에서 이렇게 쓰라고는 하는데, 사실은 빼도 별 차이 없음 ㅋ
  // 왜? 어짜피 가장 오래 걸리는 게 DB 저장일텐데 그건 알아서 비동기 처리됨.
  // 유사품으로 queueMicrotask()라는 게 있음.
  process.nextTick(() => {
    // req.logIn() 쓰면 자동 실행됨.
    done(null, { id: user._id, username: user.username }); // done() 함수의 두 번째 인자는 이 내용 적어서 세션 document를 DB에 발행함.
    // 유효기간 이런 건 알아서 기록해 주기 때문에 사용자의 id 아니면 username 이런 걸 적어두자.
    // user라는 파라미터를 출력해 보면 DB에 있던 사용자 정보를 꺼내 쓸 수 있다. (new LocalStategy에서 보내준다.)
    // 근데 정확히 짚고 넘어가자면 아직 passport를 db에 연결하지 않았기 때문에 db말고 메모리에 세션이 저장됨 ㅋ
  });

  // 아무 설정 안 했으면 유효기간이 로그인 날 + 2주
});

// passport.deserializeUser ?
// 쿠키를 분석해 주는 역할
// 쿠키는 사용자가 요청을 보낼 때마다 자동으로 보내짐.
passport.deserializeUser(async (user, done) => {
  // 세션 document에 적힌 사용자 정보를 그대로 req.user에 담아줌.
  // 이랬을 때 사용자 정보가 오래됐거나 하면 사용자 정보가 사실과 다를 수도 있음.
  // process.nextTick(() => {
  //   done(null, user); // 쿠키를 까보는 역할하는 코드임.
  // });
  let result = await db
    .collection("user")
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  process.nextTick(() => {
    return done(null, result);
  });
});

// passport lib 사용
// npm install express-session passport passport-local
// passport는 회원 인증을 도와주는 라이브러리
// passport-local은 아이디/패스워드 방식 회원 인증을 사용할 때 쓰는 라이브러리
// express-session은 세션 만드는 걸 도와주는 라이브러리입니다.
app.get("/login", (req, resp) => {
  console.log(req.user);
  resp.render("login.ejs");
});

app.post("/login", (req, resp, next) => {
  // 제출한 아이디/패스워드가 DB에 있는 것과 일치하는지 확인하고 세션을 생성한다.
  passport.authenticate("local", (error, user, info) => {
    console.log(`error: ${error}, user: ${user}, info: ${info}`);
    if (error) return resp.status(500).json(error); // .json()은 array/object 데이터를 사용자에게 보내줄 수 있음.
    if (!user) return resp.status(401).json(info.message);
    req.logIn(user, (err) => {
      if (err) return next(err);
      resp.redirect("/");
      // username: test, password: 1234
      // result.password: 1234
      // error: null, user: [object Object], info: undefined
    });
  })(req, resp, next);
});

// 세션
// 1. 가입 기능
// 2. 로그인 기능
// 3. 로그인 성공 시 세션 document 발행
// 4. 세션 document id가 담긴 쿠키를 사용자에게 보내줘서 입장권으로 사용하게 함.

app.get("/mypage", async (req, resp) => {
  // console.log(req.user);

  let result = await db
    .collection("user")
    .findOne({ _id: new ObjectId(req.user._id), username: req.user.username });
  console.log(result);

  if (!result) {
    resp.send("사용자 정보 없음.");
  }

  resp.render("mypage.ejs", { data: result });
});

app.get("/register", (req, resp) => {
  resp.render("register.ejs");
});

app.post("/register", async (req, resp) => {
  try {
    // username 빈 칸이면?
    if (!req.body.username) {
      return resp.status(400).send("username이 입력되지 않았습니다.");
    }
    // username이 이미 DB에 있으면?
    let result = await db
      .collection("user")
      .findOne({ username: req.body.username });

    if (result) {
      return resp.status(409).send("이미 등록된 username입니다.");
    }
    // password 짧으면?
    if (req.body.password.length < 4) {
      return resp
        .status(400)
        .send("password는 네 자리 이상으로 기입해 주시길 바랍니다.");
    }

    let hash = await bcrypt.hash(req.body.password, 10); // 두 번째 인자는 얼마나 꼬아서 암호화할지 결정함. 보통 10번 정도로 하고 50ms 정도 걸림
    console.log(hash);

    // 회원 가입 ㄱㄱ
    await db
      .collection("user")
      .insertOne({ username: req.body.username, password: hash });
  } catch (e) {
    console.log(e);
    resp.status(500).send("회원가입 도중 서버에서 오류가 발생했습니다.");
  }

  resp.redirect("/");
});

/*
hashing
 

근데 가입시킬 때 지금은 비번을 DB에 그대로 저장하고 있는데 

비번은 암호화해서 저장하는게 좋습니다.

그래야 DB가 털려도 원래 비번은 알 수 없으니까요.

실은 암호화라기보다는 해싱인데 해싱이 뭐냐면 어떤 문자를 다른 랜덤한 문자로 바꾸는걸 해싱이라고 합니다.

SHA3-256, SHA3-512, bcrypt, scrypt, argon2 이런 여러가지 해싱 알고리즘들이 있습니다. 


예를 들어 hello 이런 문자를 SHA3-256 알고리즘으로 해싱하면 

3338be694f50c5f338814986cdf0686453a888b84f424d792af4b9202398f392

이런 문자가 됩니다. 

해싱된 문자보고 원래 문자를 유추할 수 없습니다.

그래서 비번같은거 보관할 때 해싱해서 저장하는게 안전합니다.

참고로 나중에 유저가 로그인시 제출한 비번을 DB와 비교하고 싶으면

제출한 비번을 또 해싱해보면 DB와 비교가능합니다. 


아무튼 우리는 bcrypt라는 해싱 알고리즘을 써볼건데 이거 쓰기쉽게 도와주는 라이브러리를 설치해봅시다. 
*/
/*
salt 추가하면 더 안전함

 

비번을 해싱할 때 그냥 비번만 달랑 해싱하는게 아니라

뒤에 랜덤문자를 몰래 이어붙여서 해싱하면 좀 더 안전하지않을까요? 

실제로 그렇습니다. 그 랜덤문자를 salt라고 부릅니다.

그래서 bcrypt 라이브러리 쓰면 자동으로 salt 넣어서 해싱해줍니다. 

 

정확히 말하면 salt를 쓰면 해커들이 lookup table attack, rainbow table attack이 어려워진다는 장점이 있어서 쓰는 것인데

이것들이 뭐냐면 해커들이 해시를 보고 원래 비번을 쉽게 추론할 수 있게 만든 표 같은 것입니다. 


그런데 비번을 저장할 때 salt라는 랜덤문자를 더해서 해시해버리면

해커가 기존에 만들어놓은 표를 아예 못쓰고 새로 만들어야 하기 때문에 (salt를 넣어서 해싱한 표를 새로 만들어야하기 때문에)

그렇게 해킹을 좀 어렵게 만드는 것에 의의가 있다고 보면 됩니다.

 

그래서 salt를 패스워드 옆에 함께 보관해두는데

salt를 다른 별도의 DB나 하드웨어에 보관하는 곳들도 있습니다.

그렇게 보관하는 salt들을 pepper라고 부르는데 거기까지는 귀찮으니까 안할거고요 

아무튼 결론을 해시해서 비번을 저장하면 됩니다. 
*/
