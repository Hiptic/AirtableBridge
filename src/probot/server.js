const { records } = require("../airtable");
const { authenticate } = require("../airtable");
const env = require("dotenv").config();
var Airtable = require("airtable");

// async function updatePR(robot, context) {
//   const config = await context.config("airtable-crm.yml");
//   const airtable = authenticate(config.base);
//   records.update(airtable, context.github, "Pulls", context.payload);
// }

async function updateIssue(robot, context) {
  console.log("update to issues");
  // const config = await context.config("airtable-crm.yml");
  // const airtable = authenticate(config.base);
  const airtable = new Airtable({apiKey: env.parsed.AIRTABLE_TOKEN}).base(env.parsed.AIRTABLE_BASE);
  records.update(airtable, context.github, "Issues", context.payload);
}

function probotPlugin(robot) {
  console.log("Starting");
  // robot.on("pull_request", context => updatePR(robot, context));
  robot.on("issues", context => updateIssue(robot, context));
}

process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at:", p, "reason:", reason);
});

module.exports = probotPlugin;
//
