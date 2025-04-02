import express from "express";
import { getRandStr, readData, writeData } from "./udf.mjs";

import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/templates"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const data = await readData("users.json");
  const user = data.find(
    (user) => user.username === username && user.password === password
  );
  if (!user) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid username or password",
    });
  }
  // If user exists, create cookie and redirect
  const sessionId = getRandStr(16);
  const obj = {
    cookienum: sessionId,
    username: username,
    isAdmin: user.isAdmin,
  };
  // Add cookie to cookie.json
  const cookieData = await readData("cookies.json");
  cookieData.push(obj);
  await writeData("cookies.json", cookieData);
  if (user.isAdmin) {
    return res.redirect(`/admin/${sessionId}/faults`);
  }
  return res.redirect(`/user/${sessionId}`);
});

app.get("/user/:sessionId", async (req, res) => {
  // check if cookie exists
  const { sessionId } = req.params;
  const cookieData = await readData("cookies.json");
  const user = cookieData.find((cookie) => cookie.cookienum == sessionId);
  if (!user) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid session",
    });
  }
  // check if user is admin
  if (user.isAdmin) {
    return res.redirect(`/admin/${sessionId}`);
  }
  // read switch data from switches.json
  const switchData = await readData("switches.json");
  const sw = switchData.find((sw) => sw.username == user.username);
  //   return res.send("Data received");
  res.render("user.ejs", {
    username: user.username,
    s0: sw.states[0],
    s1: sw.states[1],
    s2: sw.states[2],
    s3: sw.states[3],
    s4: sw.states[4],
    s5: sw.states[5],
    s6: sw.states[6],
    unnum: sessionId,
  });
});

app.post("/user/:sessionId/:btnnum", async (req, res) => {
  console.log("Button pressed");
  const { sessionId, btnnum } = req.params;
  // check if sessionId exists
  const cookieData = await readData("cookies.json");
  const user = cookieData.find((cookie) => cookie.cookienum == sessionId);
  if (!user) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid session",
    });
  }
  // get switch data for this user from switches.json
  const switchData = await readData("switches.json");
  const sw = switchData.find((sw) => sw.username == user.username);
  // toggle the state of the switch
  sw.states[btnnum] = sw.states[btnnum] == 0 ? 1 : 0;
  // write the updated switch data to switches.json
  await writeData("switches.json", switchData);
  // Send 200 OK response
  res.status(200).json({ message: "State updated successfully" });
});

// api route to get switch data
app.get("/api/user/:user", async (req, res) => {
  const { user } = req.params;
  // check if user exists
  const switchData = await readData("switches.json");
  const sw = switchData.find((sw) => sw.username == user);
  if (!sw) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid session",
    });
  }
  // In sw.states, 1 is off and 2 is on
  // convert 1 to 0 and 2 to 1
  sw.states = sw.states.map((state) => (state === 1 ? 0 : 1));
  // send the switch data as json response

  res.status(200).json(sw.states);
});

app.post("/recloser/api", async (req, res) => {
  const { fault_type, recloser_attempts, time } = req.body;
  if(permanent_fault || Temp_fault){
    const faults = await readData("faults.json");
    const fault_type = ?"Permenant":"Temporary";
    const recloser_attempts = reclose_attempts;
    const time = new Date();
    const data = {fault_type, recloser_attempts, time}
    faults.push(data);
    await writeData("faults.json", faults);
    res.status(200).json({ message: "Data saved successfully" });
  }
  return;
});

app.get("/admin/:sessionID/faults", async (req, res) => {
  const { sessionID } = req.params;
  // check if cookie exists
  const cookieData = await readData("cookies.json");
  const user = cookieData.find((cookie) => cookie.cookienum == sessionID);
  if (!user) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid session",
    });
  }
  // check if user is admin
  if (!user.isAdmin) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "You are not an admin",
    });
  }

  const faults = await readData("faults.json");
  res.render("faults.ejs", { faults });
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.listen(port, () => {
  console.log("Listening on port 3000");
});
