const { authenticate, search } = require("../../github");
const {
  records,
  authenticate: authenticateAirtable
} = require("../../airtable");
const cache = require("../../utils/cache");
const debug = require("debug")("devtools-bot");
const env = require("dotenv").config();
var Airtable = require("airtable");

const airtable = new Airtable({apiKey: env.parsed.AIRTABLE_TOKEN}).base(env.parsed.AIRTABLE_BASE);

const github = authenticate();
const owner = "Hiptic";
const repo = "OneSignal";

async function getLabels() {
  return search({ cache: true }, "labels", page =>
    github.issues.getLabels({
      owner,
      repo,
      per_page: 100,
      state: "all",
      page
    })
  );
}

async function getIssues() {
  return search({ cache: true }, "issues", page =>
    github.issues.getForRepo({
      owner,
      repo,
      per_page: 100,
      state: "all",
      page
    })
  );
}

async function getUsers() {
  return search({ cache: true }, "users", page =>
    github.orgs.getMembers({
      org: owner,
      per_page: 100,
      page
    })
  );
}

(async () => {
  const labels = await getLabels();
  const label_payloads = labels.map(label => ({ label }));
  await records.updateRecords(airtable, github, "Labels", label_payloads);

  const users = await getUsers();
  await records.updateRecords(airtable, github, "Users", users);

  const issues = await getIssues();
  const payloads = issues.map(issue => ({ issue }));
  await records.updateRecords(airtable, github, "Issues", payloads);
})();

process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at:", p, "reason:", reason);
});
