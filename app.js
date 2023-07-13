const express = require("express");

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const app = express();

app.use(express.json());
const path = require("path");

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertObjSnakeToCamel = (newObj) => {
  return {
    stateId: newObj.state_id,
    stateName: newObj.state_name,
    population: newObj.population,
  };
};
const districtSnakeToCamel = (newObj) => {
  return {
    districtId: newObj.district_id,
    districtName: newObj.district_name,
    stateId: newObj.state_id,
    cases: newObj.cases,
    cures: newObj.cures,
    active: newObj.active,
    deaths: newObj.deaths,
  };
};
const reportSnakeToCamel = (newObject) => {
  return {
    totalCases: newObject.cases,
    totalCured: newObject.cured,
    totalActive: newObject.active,
    totalDeaths: newObject.deaths,
  };
};
app.get("/states/", async (request, response) => {
  const getAllStates = `SELECT * FROM state`;
  const dpResponse = await db.all(getAllStates);
  const stateResult = dpResponse.map((newObject) => {
    return convertObjSnakeToCamel(newObject);
  });
  response.send(stateResult);
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStates = `SELECT * FROM state WHERE state_id=${stateId};`;
  const newStates = await db.get(getStates);
  const stateResult = convertObjSnakeToCamel(newStates);

  response.send(stateResult);
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDetails = `INSERT INTO district (district_name,state_id,cases,cured,active,deaths) 
    VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths})`;
  const dbRes = await db.run(postDetails);
  const districtId = dbRes.lastID;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistricts = `SELECT * FROM district WHERE district_id=${districtId}`;
  const districtResponse = await db.get(getDistricts);
  response.send(districtSnakeToCamel(districtResponse));
});

app.delete("districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const removeDistricts = `DELETE FROM district WHERE district_id=${districtId}`;
  await db.run(removeDistricts);
  response.send("District Removed");
});
app.put("districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updatedDistrictDetails = `
    UPDATE district SET 
    district_name:'${districtName}',
    state_id:${stateId},
    cases:${cases},
    cured:${cured},
    active:${active},
    deaths:${deaths},
    WHERE district_id=${districtId}`;
  await db.run(updatedDistrictDetails);
  response.send("District Details Updated");
});

app.get("states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
    SELECT 
    SUM(cases) AS cases,
    SUM(curved) AS cured,
    SUM(active) AS active,
    SUM(deaths) As deaths
    FROM district
    WHERE 
    state_id=${stateId}`;
  const stateDetails = await db.get(stateQuery);
  const resultReport = reportSnakeToCamel(stateDetails);
  response.send(resultReport);
});

app.get("districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateQuery = `SELECT state_name FROM state   NATURAL JOIN district WHERE district_id= ${districtId}`;
  const stateName = await db.get(stateQuery);
  response.send(districtSnakeToCamel(stateName));
});

module.exports = app;
