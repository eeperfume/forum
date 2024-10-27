const checkLogin = (req, resp, next) => {
  console.log("로그인을 했는지 확인합니다.");
  if (!req.user) {
    return resp.send("로그인을 해야 합니다.");
  }
  next(); // 이거 안 하면 무한 대기 상태에 빠질 수 있음. 미들웨어 코드 실행 끝났으니까 다음으로 이동해 주세요.
};

module.exports = checkLogin;
