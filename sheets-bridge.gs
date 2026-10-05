/** Deploy as a web app: execute as you, access Anyone.
 * Only explicitly published stages and allowlisted league fields are exported.
 * The spreadsheet itself can remain private. No Payment tab is read.
 * Script property PUBLISHED_STAGES: e.g. 1 or 1,2 after checking each stage.
 */
function doGet() {
  try {
    const stages = [...new Set((PropertiesService.getScriptProperties().getProperty('PUBLISHED_STAGES') || '').split(',').map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 6))].sort();
    const ss = SpreadsheetApp.openById('1QLlISwM9Tpui4hLwQbGw0SJb7OLnQinegTTv7RAnfZQ');
    const results = ss.getSheetByName('Stage results').getRange('A6:H101').getValues();
    const sheet = ss.getSheetByName('Leg log');
    const legs = sheet.getRange('A6:M2005').getValues();
    const notes = sheet.getRange('A6:M2005').getNotes();
    const points = {'Champion':6,'Runner-up':4,'Joint 3rd':3,'3rd':3,'4th':3,'Participant':1};
    const publishedResults = results.filter(r => stages.includes(Number(r[0])) && r[6] === 'Yes' && !r[7] && points[r[3]] !== undefined).map(r => ({stage:Number(r[0]),players:[String(r[1]),String(r[2])],finish:r[3],points:points[r[3]]}));
    const playerKeys = new Set(publishedResults.flatMap(r => r.players.map(p => r.stage + '|' + p)));
    const publishedLegs = [];
    for (let i=0;i<legs.length;i++) {
      const r=legs[i],stage=Number(r[0]);
      if (!stages.includes(stage) || !['W','L'].includes(r[8]) || !['701 PPD','CR MPR'].includes(r[3])) continue;
      if (!playerKeys.has(stage+'|'+r[4]) || !playerKeys.has(stage+'|'+r[6])) continue;
      // Pending stat rows can be exported with a visible flag; actual input errors cannot.
      if (r[12] && !['Not checked','Missing / invalid stats'].includes(r[12])) continue;
      const players=[String(r[4]),String(r[6])];
      const provisionalPlayers=players.filter((p,j) => /PROVISIONAL/i.test(notes[i][j===0?5:7]));
      if (r[11] !== 'Yes' && !provisionalPlayers.length) provisionalPlayers.push(...players);
      publishedLegs.push({stage,match:String(r[1]),leg:Number(r[2]),game:r[3],players,stats:[r[5],r[7]].map(v=>typeof v==='number'&&isFinite(v)?v:null),result:r[8],opponents:String(r[9]).split(' / '),provisionalPlayers});
    }
    return json_({schemaVersion:1,updatedAt:new Date().toISOString(),publishedStages:stages,results:publishedResults,legs:publishedLegs});
  } catch (error) { return json_({error:'Results temporarily unavailable'}); }
}
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
