const POLICIES = {
  growth: {
    id: "growth",
    name: "Tăng tốc sản xuất",
    icon: "⚡",
    base: { gdp: 10, welfare: -3, stability: -2 },
  },
  welfare: {
    id: "welfare",
    name: "Đầu tư an sinh",
    icon: "❤",
    base: { gdp: 2, welfare: 9, stability: 2 },
  },
  infrastructure: {
    id: "infrastructure",
    name: "Xây hạ tầng",
    icon: "⬡",
    base: { gdp: 5, welfare: 2, stability: 8 },
  },
  speculation: {
    id: "speculation",
    name: "Đầu cơ mạo hiểm",
    icon: "🎲",
    base: { gdp: 0, welfare: -2, stability: -3 },
  },
};

const EVENTS = [
  {
    id: "consumer-boom",
    round: 1,
    kicker: "CẦU TĂNG VỌT",
    title: "Cơn sốt tiêu dùng",
    description:
      "Nhu cầu thị trường tăng mạnh. Cơ hội kiếm lời rất lớn, nhưng chạy quá nhanh có thể làm hệ thống mất cân bằng.",
    news: "Doanh nghiệp mở rộng sản xuất, người tiêu dùng chi tiêu mạnh.",
    policyBonus: { growth: { gdp: 5 }, infrastructure: { gdp: 2 } },
  },
  {
    id: "fdi-wave",
    round: 2,
    kicker: "CỬA HỘI NHẬP MỞ RA",
    title: "Làn sóng vốn và công nghệ",
    description:
      "Một chuỗi cung ứng quốc tế đang tìm nơi đầu tư. Hạ tầng tốt sẽ biến cơ hội thành tăng trưởng dài hạn.",
    news: "Vốn, công nghệ và thị trường quốc tế cùng xuất hiện.",
    policyBonus: {
      infrastructure: { gdp: 7, stability: 2 },
      growth: { gdp: 3 },
    },
  },
  {
    id: "inequality",
    round: 3,
    kicker: "TĂNG TRƯỞNG KHÔNG ĐỀU",
    title: "Khoảng cách thu nhập nới rộng",
    description:
      "Sản lượng vẫn tăng nhưng một bộ phận người dân bị bỏ lại. Đầu tư an sinh đúng lúc sẽ giữ sức mua và ổn định xã hội.",
    news: "Áp lực việc làm, y tế và giáo dục tăng cao.",
    policyBonus: { welfare: { welfare: 8, gdp: 2 } },
    afterRound(team) {
      if (team.welfare < 45) {
        return {
          delta: { gdp: -5, welfare: -3, stability: -4 },
          note: "An sinh thấp khiến tăng trưởng bị phản tác dụng.",
        };
      }
      return {
        delta: { gdp: 2, welfare: 1, stability: 3 },
        note: "Nền tảng an sinh giúp đội giữ nhịp phát triển.",
      };
    },
  },
  {
    id: "public-investment",
    round: 4,
    kicker: "NHÀ NƯỚC ĐIỀU TIẾT",
    title: "Đầu tư công và ổn định vĩ mô",
    description:
      "Nguồn lực công được đưa vào hạ tầng thiết yếu. Thị trường vẫn cạnh tranh, nhưng luật chơi hướng về ổn định chung.",
    news: "Hạ tầng, dịch vụ công và năng lực chống sốc được củng cố.",
    policyBonus: {
      infrastructure: { stability: 7, welfare: 3 },
      welfare: { stability: 3 },
    },
    publicPolicy: true,
  },
  {
    id: "natural-shock",
    round: 5,
    kicker: "CÚ SỐC BẤT NGỜ",
    title: "Thiên tai làm đứt gãy sản xuất",
    description:
      "Chuỗi cung ứng bị gián đoạn. Đội chỉ chạy theo lợi nhuận sẽ trả giá nếu thiếu hạ tầng và dự phòng.",
    news: "Năng lực chống chịu quyết định ai đứng vững.",
    policyBonus: { infrastructure: { stability: 5, gdp: 2 } },
    afterRound(team) {
      if (team.stability < 48) {
        return {
          delta: { gdp: -8, welfare: -2, stability: -5 },
          note: "Hệ thống thiếu ổn định nên thiệt hại lan rộng.",
        };
      }
      return {
        delta: { gdp: 3, welfare: 2, stability: 2 },
        note: "Hạ tầng và dự phòng tốt giúp đội phục hồi nhanh.",
      };
    },
  },
  {
    id: "global-crisis",
    round: 6,
    kicker: "VÒNG QUYẾT ĐỊNH",
    title: "Khủng hoảng kinh tế toàn cầu",
    description:
      "Không chỉ đội giàu nhất, mà đội cân bằng giữa tăng trưởng, con người và ổn định mới có cơ hội chiến thắng.",
    news: "Mọi lựa chọn từ đầu trận đều được kiểm chứng.",
    policyBonus: {
      welfare: { welfare: 4, stability: 2 },
      infrastructure: { stability: 5 },
      growth: { gdp: 2 },
    },
    afterRound(team) {
      const lowest = Math.min(team.gdp, team.welfare, team.stability);
      if (lowest >= 48) {
        return {
          delta: { gdp: 5, welfare: 5, stability: 5 },
          note: "Ba trụ cân bằng tạo sức bật trong khủng hoảng.",
        };
      }
      return {
        delta: { gdp: -2, welfare: -2, stability: -2 },
        note: "Một trụ quá yếu kéo toàn bộ mô hình đi xuống.",
      };
    },
  },
];

const TEAM_PRESETS = [
  { name: "Rồng Việt", color: "#ff5d73", accent: "#ffb3bd" },
  { name: "Sao Vàng", color: "#ffc857", accent: "#ffe4a3" },
  { name: "Tre Xanh", color: "#45d483", accent: "#a9f3c8" },
  { name: "Mê Kông", color: "#49a8ff", accent: "#afd8ff" },
  { name: "Đông Sơn", color: "#a47cff", accent: "#d8c7ff" },
  { name: "Biển Đông", color: "#34d1bf", accent: "#a9f3eb" },
  { name: "Trường Sơn", color: "#ff9657", accent: "#ffd0b3" },
  { name: "Sen Việt", color: "#ef6fbd", accent: "#f8bce1" },
  { name: "Cửu Long", color: "#8bd450", accent: "#ccefac" },
  { name: "Thăng Long", color: "#7f95ff", accent: "#c5ceff" },
];

function clamp(value, min = 0, max = 120) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function addDelta(target, delta = {}) {
  target.gdp = clamp(target.gdp + (delta.gdp || 0));
  target.welfare = clamp(target.welfare + (delta.welfare || 0));
  target.stability = clamp(target.stability + (delta.stability || 0));
  return target;
}

function majority(votes, allowed) {
  const counts = Object.fromEntries(allowed.map((key) => [key, 0]));
  for (const vote of votes) {
    if (Object.hasOwn(counts, vote)) counts[vote] += 1;
  }
  let winner = allowed[0];
  for (const key of allowed) {
    if (counts[key] > counts[winner]) winner = key;
  }
  return { winner, counts };
}

function speculationDelta(roundIndex, teamIndex) {
  const roll = (roundIndex * 17 + teamIndex * 31 + 7) % 10;
  if (roll < 4) return { gdp: 17, welfare: -2, stability: -4 };
  if (roll < 7) return { gdp: 8, welfare: -2, stability: -3 };
  return { gdp: -10, welfare: -3, stability: -7 };
}

function applyPolicy(team, policyId, event, roundIndex, teamIndex) {
  const policy = POLICIES[policyId] || POLICIES.infrastructure;
  const delta = { ...policy.base };

  if (policyId === "speculation") {
    Object.assign(delta, speculationDelta(roundIndex, teamIndex));
  }

  const bonus = event.policyBonus?.[policyId] || {};
  for (const key of ["gdp", "welfare", "stability"]) {
    delta[key] = (delta[key] || 0) + (bonus[key] || 0);
  }

  addDelta(team, delta);
  return { policy, delta };
}

function resolveDuel(teamA, teamB, choiceA, choiceB) {
  const a = choiceA === "compete" ? "compete" : "cooperate";
  const b = choiceB === "compete" ? "compete" : "cooperate";

  if (a === "cooperate" && b === "cooperate") {
    addDelta(teamA, { gdp: 5, welfare: 2, stability: 2 });
    addDelta(teamB, { gdp: 5, welfare: 2, stability: 2 });
    return "Hai đội bắt tay: cùng tăng trưởng và giữ niềm tin.";
  }

  if (a === "compete" && b === "cooperate") {
    addDelta(teamA, { gdp: 10, welfare: -1, stability: -1 });
    addDelta(teamB, { gdp: -3, welfare: -1, stability: -2 });
    return `${teamA.name} chơi rắn và giành phần lợi lớn.`;
  }

  if (a === "cooperate" && b === "compete") {
    addDelta(teamB, { gdp: 10, welfare: -1, stability: -1 });
    addDelta(teamA, { gdp: -3, welfare: -1, stability: -2 });
    return `${teamB.name} chơi rắn và giành phần lợi lớn.`;
  }

  addDelta(teamA, { gdp: 2, welfare: -2, stability: -4 });
  addDelta(teamB, { gdp: 2, welfare: -2, stability: -4 });
  return "Hai đội cùng chơi rắn: có lợi ngắn hạn nhưng mất ổn định.";
}

function calculateScore(team) {
  return Math.round(team.gdp * 0.45 + team.welfare * 0.3 + team.stability * 0.25);
}

function createTeam(index) {
  const preset = TEAM_PRESETS[index % TEAM_PRESETS.length];
  return {
    id: `team-${index + 1}`,
    index,
    ...preset,
    gdp: 40,
    welfare: 40,
    stability: 40,
    players: [],
    policyVotes: {},
    duelVotes: {},
    selectedPolicy: null,
    duelChoice: null,
    lastRound: null,
    score: 40,
  };
}

function serializeTeam(team, includeVotes = false) {
  const data = {
    id: team.id,
    index: team.index,
    name: team.name,
    color: team.color,
    accent: team.accent,
    gdp: team.gdp,
    welfare: team.welfare,
    stability: team.stability,
    players: team.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      connected: player.connected,
    })),
    selectedPolicy: team.selectedPolicy,
    duelChoice: team.duelChoice,
    lastRound: team.lastRound,
    score: calculateScore(team),
  };
  if (includeVotes) {
    data.policyVoteCount = Object.keys(team.policyVotes).length;
    data.duelVoteCount = Object.keys(team.duelVotes).length;
  }
  return data;
}

module.exports = {
  POLICIES,
  EVENTS,
  TEAM_PRESETS,
  addDelta,
  majority,
  applyPolicy,
  resolveDuel,
  calculateScore,
  createTeam,
  serializeTeam,
};
