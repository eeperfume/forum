const express = require("express");
const app = express();
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");
require("dotenv").config();

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
      mongoUrl: process.env.DB_URL, // DB 접속 URl
      dbName: "forum",
    }),
  })
);
app.use(passport.session());

const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = new S3Client({
  region: "ap-northeast-2", // 서울 데이터센터에 저장할 거면 이거
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "eeperfumebucket",
    key: function (req, file, cb) {
      console.log(req.file); // 파일명
      cb(null, Date.now().toString()); //업로드 시 파일명 변경 가능
    },
  }),
});

const { MongoClient, ObjectId } = require("mongodb");
const { route } = require("./routes/shop");

let connectDB = require("./database.js");

let db;
connectDB
  .then((client) => {
    console.log("DB 연결 성공");
    db = client.db("forum");
    app.listen(process.env.PORT, () => {
      console.log("listening on 8080");
    });
  })
  .catch((err) => {
    console.log(err);
  });

const checkLogin = (req, resp, next) => {
  if (!req.user) {
    return resp.send("로그인을 해야 합니다.");
  }
  next(); // 이거 안 하면 무한 대기 상태에 빠질 수 있음. 미들웨어 코드 실행 끝났으니까 다음으로 이동해 주세요.
};

const getLocaleTime = (req, resp, next) => {
  console.log(new Date());
  next();
};

const checkUserInfo = (req, resp, next) => {
  // username 빈 칸이면?
  if (!req.body.username) {
    return resp.status(400).send("username이 입력되지 않았습니다.");
  }
  // password 빈 칸이면?
  if (!req.body.password) {
    return resp.status(400).send("password가 입력되지 않았습니다.");
  }
  next();
};

// app.use(checkLogin);
// app.use("/URL", checkLogin); // 제약사항을 걸 수 있음.
// URL과 일치하는 API get,post,put,delete 같은 요청이 들어 올 때 미들웨어 코드를 실행해 줄 수 있음.
// 그런데 이렇게 하면 /URL 뿐만 아니라 /URL/URL/... 등 하위 모든 URL에 대해서도 적용됨.
// 그리고 이거 밑에 있는 코드만 적용됨.
app.use("/list", getLocaleTime);

// app.get("/pet", [checkLogin, getLocaleTime, checkUserInfo], (req, resp) => {
//   resp.send("펫 용품 쇼핑할 수 있는 페이지입니다.");
// });

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

app.get("/list", checkLogin, async (req, resp) => {
  resp.locals.user = req.user;
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

app.post("/add", upload.single("img1"), async (req, resp) => {
  // app.post("/add", upload.array("img1", 2), async (req, resp) => {
  // console.log(req.file); // upload.single() 업로드 완료 시 이미지의 URL은 이 안에 들어있음
  // console.log(req.files); // upload.array() 업로드 완료 시 이미지의 URL은 이 안에 들어있음
  // console.log(req.body);
  try {
    if ("" == req.body.title) {
      return resp.send("제목이 입력되지 않았습니다.");
    }
    if ("" == req.body.content) {
      return resp.send("내용이 입력되지 않았습니다.");
    }
    // throw new Exception("강제로 예외를 발생시켰습니다.");
    let result = await db.collection("post").insertOne({
      title: req.body.title,
      content: req.body.content,
      img: req.file?.location,
      user: req.user._id,
      username: req.user.username,
    });
    console.log(`result: ${result}`);
    resp.redirect("/list");
  } catch (e) {
    console.log(e);
    resp.status(500).send("서버에서 오류가 발생했습니다.");
  }
  // upload.array(
  //   "img1",
  //   2
  // )(() => {
  //   console.log(req.files);
  // });
});

app.get("/detail/:id", async (req, resp) => {
  // console.log(req.params);
  try {
    resp.locals.username = req.user.username;
    console.log(req.user);
    let result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(req.params.id) });
    // console.log(result);
    if (result == null) {
      resp.status(404).send("존재하지 않는 페이지입니다.");
    }
    let results = await db
      .collection("comment")
      .find({ parentId: new ObjectId(req.params.id) })
      .toArray();
    // console.log(results);
    resp.render("detail.ejs", { data: result, comments: results });
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
  let result = await db.collection("post").deleteOne({
    _id: new ObjectId(req.query.id),
    user: new ObjectId(req.user._id),
  });
  console.log(result);
  result.deletedCount == 0
    ? resp.status(403).send("님이 쓴 글이 아님")
    : resp.send("삭제를 완료했습니다.");
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
  // console.log(req.user);
  resp.render("login.ejs");
});

app.post("/login", checkUserInfo, (req, resp, next) => {
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

app.post("/register", checkUserInfo, async (req, resp) => {
  try {
    // // username 빈 칸이면?
    // if (!req.body.username) {
    //   return resp.status(400).send("username이 입력되지 않았습니다.");
    // }
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

app.use("/shop", require("./routes/shop.js"));
app.use("/board/sub", require("./routes/board.js"));

app.get("/search", async (req, resp) => {
  // let results = await db
  //   .collection("post")
  //   .find({ title: { $regex: req.query.val } }) // 정규식으로 SQL의 like 처럼 동작하게 함.
  //   .toArray();
  // let results = db
  //   .collection()
  //   .find({ $text: { $search: req.query.val } }) // index 통해서 데이터 조회 시 문법 // 숫자를 찾는 경우엔 $text 필요없음. 그냥 평소에 쓰던 문법 그대로 써도 index를 알아서 사용함.
  //   .toArray();
  // let results = await db
  //   .collection("post")
  //   .find({ title: { $regex: req.query.val } })
  //   .explain("executionStats"); // 처리 성능울 보여줌.
  let searchOption = [
    {
      $search: {
        index: "title_index",
        text: { query: req.query.val, path: "title" },
      },
    },
    {
      $sort: { _id: -1 }, // 검색 결과를 _id 역순으로 정렬
    },
    {
      $limit: 1, // 검색 결과를 하나만 갖다주셈
    },
    // {
    //   $skip: 10, // 위에서 10개를 스킵하고 다음 거 갖다주셈
    // },
    // { $project: { content: 1 } }, // 필드 숨기기 기능, 0이면 숨겨주셈 1이면 보여주셈
  ];
  let results = await db.collection("post").aggregate(searchOption).toArray();
  resp.render("search.ejs", { datas: results });
});

app.post("/comment", async (req, resp) => {
  console.log(req.body);
  await db.collection("comment").insertOne({
    content: req.body.content,
    writerId: new ObjectId(req.user.id),
    writer: req.user.username,
    parentId: new ObjectId(req.body.parentId),
  });
  // resp.render("list.ejs");
  // resp.redirect("back");
  resp.send("댓글 등록을 완료했습니다.");
});
