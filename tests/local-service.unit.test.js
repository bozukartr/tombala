import test from 'node:test';
import assert from 'node:assert/strict';
import { createTicket } from '../js/core/ticket.js';
import { nextNumber, normalizeWinners, validateClaim, winnerIds } from '../js/core/game.js';
import * as service from '../js/services/local-room.js';

test('yerel servis botlarla tam oyunu tombalaya kadar bitiriyor', async () => {
  const uid = await service.connect();
  const code = await service.createRoom(
    { name: 'Test', avatar: '🦊', color: '#ffcc4a' },
    { drawMode: 'manual', drawInterval: 4000, autoMark: true },
    createTicket(),
  );
  let room;
  const unsubscribe = service.subscribe(code, (nextRoom) => { room = nextRoom; });
  await service.updateMe(code, { ready: true });
  await service.updateStatus(code, 'playing');

  while (room.meta.status === 'playing' && room.game.drawn.length < 90) {
    const number = nextNumber(room.game.drawn);
    await service.pushDraw(code, room.game.revision, [...room.game.drawn, number], number);
    for (const [playerId, claim] of Object.entries(room.claims || {})) {
      const result = validateClaim({
        type: claim.type, uid: playerId, player: room.players[playerId],
        drawn: room.game.drawn, winners: room.winners,
      });
      const winners = normalizeWinners(room.winners);
      if (result.valid) winners[result.type][playerId] = true;
      await service.resolveClaim(code, playerId, { ...result, type: claim.type }, winners);
      if (result.valid && result.type === 'tombala') await service.updateStatus(code, 'finished');
    }
  }

  assert.equal(room.meta.status, 'finished');
  assert.ok(winnerIds(room.winners, 'cinko1').length > 0);
  assert.ok(winnerIds(room.winners, 'cinko2').length > 0);
  assert.ok(winnerIds(room.winners, 'tombala').length > 0);
  assert.ok(room.game.drawn.length <= 90);
  assert.equal(room.players[uid].ready, true);
  unsubscribe();
  await service.leaveRoom();
});
