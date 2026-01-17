import { parseEvent, parseHeader, parsePlayerInfo } from '@laihoe/demoparser2';
import fs from 'node:fs';

class Conversor {
  TEAMS = { 2: 'T', 3: 'CT' };

  TICK_RATE = 64;

  players = [];

  playerDeath = [];

  startTime?: Date;

  changeTeamTick?: number;

  teams: number[] = [];

  match: { [key: string]: any } = null;

  mySteamID: number;

  filename: string;

  constructor(filename: string) {
    this.filename = filename;

    const stats = fs.statSync(filename);

    this.players = parsePlayerInfo(filename);
    if (!this.players) throw new Error('No players found in demo');
    this.mySteamID = parseInt(this.players[0].steamid, 10);
    this.playerDeath = parseEvent(filename, 'player_death');
    this.startTime = stats.mtime;

    this.identifyTeam();
    this.parse();
  }

  parse() {
    let teamA = this.getTeamMates().map((player: { [key: string]: any }) => {
      const steamId = parseInt(player['steamid'], 10);
      return {
        id: steamId,
        name: player['name'],
        kills: this.getKills(steamId),
        deaths: this.getPlayerDeaths(steamId),
        assists: this.getAssists(steamId),
      };
    });
    let teamB = this.getOpponentTeam().map((player: { [key: string]: any }) => {
      const steamId = parseInt(player['steamid'], 10);
      return {
        id: steamId,
        name: player['name'],
        kills: this.getKills(steamId),
        deaths: this.getPlayerDeaths(steamId),
        assists: this.getAssists(steamId),
      };
    });
    this.match = {
      map: this.getMap(),
      game_duration: this.gameDuration,
      total_rounds: this.getRoundTicks().length,
      teams: [
        {
          name: 'Team A',
          bombs_planted: this.getBombPlanted(true),
          bombs_defused: this.getBombDefused(true),
          rounds_wins: this.getRoundVictories(true),
          players: teamA,
        },
        {
          name: 'Team B',
          bombs_planted: this.getBombPlanted(false),
          bombs_defused: this.getBombDefused(false),
          rounds_wins: this.getRoundVictories(false),
          players: teamB,
        },
      ],
    };
  }

  getMap(): string {
    return parseHeader(this.filename).map_name;
  }

  get gameDuration(): number {
    const lastTick = parseEvent(this.filename, 'cs_win_panel_match');
    if (!lastTick) return 0;
    return parseInt((lastTick.pop().tick / this.TICK_RATE).toFixed(0), 10);
  }

  identifyTeam() {
    const playerTeam = parseEvent(this.filename, 'player_team');
    if (!playerTeam) throw new Error('Player team not found');

    let me = playerTeam.find(player => player.user_steamid == this.mySteamID);
    this.changeTeamTick = me.tick;
    this.teams = [me.oldteam, me.team];
  }

  myTeam(atTick: number) {
    if (this.teams.length < 2) throw new Error('Not enough teams to identify my team');
    if (!this.changeTeamTick) throw new Error('Change team tick not found');
    if (atTick < this.changeTeamTick) return this.teams[0];
    return this.teams[1];
  }

  isInMyTeam(key: string, value: any): boolean {
    return this.getTeamMates().some((player: { [key: string]: any }) => player[key] == value);
  }

  getTeamMates() {
    const me: { [key: string]: any } = this.players.find(
      (player: { [key: string]: any }) => player['steamid'] == this.mySteamID,
    );
    if (!me) throw new Error('My player not found');
    return this.players.filter(
      (player: { [key: string]: any }) => player['team_number'] == me['team_number'],
    );
  }

  getOpponentTeam() {
    const me: { [key: string]: any } = this.players.find(
      (player: { [key: string]: any }) => player['steamid'] == this.mySteamID,
    );
    if (!me) throw new Error('My player not found');
    return this.players.filter(
      (player: { [key: string]: any }) => player['team_number'] != me['team_number'],
    );
  }

  getUsersTeamMates(steamId: number) {
    const me: { [key: string]: any } = this.players.find(
      (player: { [key: string]: any }) => player['steamid'] == steamId,
    );
    if (!me) throw new Error('My player not found');
    return this.players.filter(
      (player: { [key: string]: any }) => player['team_number'] == me['team_number'],
    );
  }

  getKills(steamid: number): number {
    const cannotBeVictim = this.getUsersTeamMates(steamid).map(
      (player: { [key: string]: any }) => player['steamid'],
    );
    const kills = this.playerDeath.filter(
      (death: { [key: string]: any }) => !cannotBeVictim.includes(death['user_steamid']) && death['attacker_steamid'] == steamid,
    );
    return kills.length;
  }

  getAssists(steamid: number): number {
    const cannotBeVictim = this.getUsersTeamMates(steamid).map(
      (player: { [key: string]: any }) => player['steamid'],
    );
    const assists = this.playerDeath.filter(
      (death: { [key: string]: any }) =>
        !cannotBeVictim.includes(death['user_steamid']) && death['assister_steamid'] == steamid,
    );
    return assists.length;
  }

  getPlayerDeaths(steamid: number): number {
    const deaths = this.playerDeath.filter(
      (death: { [key: string]: any }) =>
        death['assister_steamid'] != steamid &&
        death['attacker_steamid'] != steamid &&
        death['attacker_steamid'] != null &&
        death['user_steamid'] == steamid,
    );
    return deaths.length;
  }

  getRoundTicks(): [number[]] {
    const freezeEndTicks = parseEvent(this.filename, 'round_freeze_end').map(event => event.tick);
    let rounds = [];
    freezeEndTicks.forEach((tick, index) => {
      rounds.push([tick, freezeEndTicks[index + 1] || null]);
    });
    return rounds;
  }

  getRoundVictories(myTeam: boolean): number {
    const victories = 0;
    const roundEnd = parseEvent(this.filename, 'round_end');
    if (!roundEnd) throw new Error('Round end not found');

    let oldTeam = this.TEAMS[this.teams[1]];
    let team = this.TEAMS[this.teams[0]];

    if (myTeam) {
      oldTeam = this.TEAMS[this.teams[0]];
      team = this.TEAMS[this.teams[1]];
    }

    const oldTeamRounds = roundEnd.filter(round => round.tick <= this.changeTeamTick);
    const oldTeamVictories = oldTeamRounds.filter(round => round.winner == oldTeam).length;

    const teamRounds = roundEnd.filter(round => round.tick > this.changeTeamTick);
    const teamVictories = teamRounds.filter(round => round.winner == team).length;

    return teamVictories + oldTeamVictories;
  }

  getBombPlanted(myTeam: boolean): number {
    const usersWhoPlanted = parseEvent(this.filename, 'bomb_planted').map(event => event['user_steamid']);
    let team = this.getTeamMates().map(player => player['steamid']);
    if (!myTeam) team = this.getOpponentTeam().map(player => player['steamid']);
    let count = 0;
    usersWhoPlanted.forEach((steamId: number) => count += team.includes(steamId) ? 1 : 0);
    return count;
  }

  getBombDefused(myTeam: boolean): number {
    const usersWhoDefused = parseEvent(this.filename, 'bomb_defused').map(
      (event) => event['user_steamid'],
    );
    let team = this.getTeamMates().map((player) => player['steamid']);
    if (!myTeam) team = this.getOpponentTeam().map((player) => player['steamid']);
    let count = 0;
    usersWhoDefused.forEach((steamId: number) => (count += team.includes(steamId) ? 1 : 0));
    return count;
  }

  won(myTeam: boolean): boolean {
    return this.getRoundVictories(myTeam) > this.getRoundVictories(!myTeam);
  }

  draw(myTeam: boolean): boolean {
    return this.getRoundVictories(myTeam) == this.getRoundVictories(!myTeam);
  }

  toJson() {
    return JSON.stringify(this.match);
  }
}

export default Conversor;

const conversor = new Conversor(
  '/Users/felipebolonhani/projects/gamersbrawl/cs-demo-downloader/demos/3797836808004305163.dem',
);

