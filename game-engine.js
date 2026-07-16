const TEAM_PRESETS = [
  { color: "#66e3ff", accent: "#b8f3ff" },
  { color: "#ffd166", accent: "#ffe9a8" },
  { color: "#8ce99a", accent: "#c8f7d0" },
  { color: "#ff7b8a", accent: "#ffc0c7" },
  { color: "#b197fc", accent: "#ddd2ff" },
  { color: "#63e6be", accent: "#b8f5e2" },
  { color: "#ffa94d", accent: "#ffd4a8" },
  { color: "#f783d1", accent: "#fac0e8" },
];

function createTeam(index) {
  const preset = TEAM_PRESETS[index % TEAM_PRESETS.length];
  return {
    id: `team-${index + 1}`,
    index,
    name: `Đội ${index + 1}`,
    ...preset,
    players: [],
  };
}

function serializeTeam(team) {
  return {
    id: team.id,
    index: team.index,
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

module.exports = { TEAM_PRESETS, createTeam, serializeTeam };
