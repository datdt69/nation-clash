const TEAM_PRESETS = [
  { color: "#06728d", accent: "#d8f2f8" },
  { color: "#9a6500", accent: "#fff0c7" },
  { color: "#2b7a3d", accent: "#ddf4e1" },
  { color: "#b52f43", accent: "#f9dce1" },
  { color: "#6545b8", accent: "#e9e1fa" },
  { color: "#087d64", accent: "#d7f3eb" },
  { color: "#a84f00", accent: "#fae4cf" },
  { color: "#a73283", accent: "#f7dced" },
];

// Đội 7 vận hành màn host, vì vậy tám đội giao dịch dùng các số còn lại.
const TEAM_NUMBERS = [1, 2, 3, 4, 5, 6, 8, 9];

function createTeam(index) {
  const preset = TEAM_PRESETS[index % TEAM_PRESETS.length];
  const number = TEAM_NUMBERS[index] ?? index + 1;
  return {
    id: `team-${number}`,
    index,
    number,
    name: `Đội ${number}`,
    ...preset,
    players: [],
  };
}

function serializeTeam(team) {
  return {
    id: team.id,
    index: team.index,
    number: team.number,
    name: team.name,
    color: team.color,
    accent: team.accent,
    players: team.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      connected: player.connected,
    })),
  };
}

module.exports = { TEAM_PRESETS, TEAM_NUMBERS, createTeam, serializeTeam };
