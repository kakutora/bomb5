//----------------------------------------------------------------

const SMOOTH = 1;//補完処理

const img = {//画像パス
    chr: "/img/chr.png"
};

let mapImg;//マップチップ画像
let chrImg;//マップチップ画像

let vScreen;//仮想画面
let rScreen;//実画面

let rWidth;//実画面の幅
let rHeight;//実画面の高さ

let defaultMoveSpeed = 4;

let playerX;
let PlayerY;
let playerMove = 0;

let key = {
    up: false,
    down: false,
    left: false,
    right: false
};
let pid;
let players = {};

let p = document.querySelector("p");



vScreen = document.createElement('canvas');
const ctx = vScreen.getContext("2d");

//----------------------------------------------------
const socket = io({
    reconnection: true,  // 再接続を有効にする
    reconnectionAttempts: 3,  // 再接続試行回数の設定
    reconnectionDelay: 1000,  // 再接続試行間隔(ms)の設定
}); // Socket.IOのインスタンスを作成

document.querySelector("button").addEventListener("click", () => {
    socket.emit("ready");
});

document.querySelector('body').addEventListener('click', () => {
    console.log(JSON.stringify(players));

});

socket.on('reload', () => {
    // ページをリロードする
    location.reload();
});

socket.on("startGame", (data) => {
    firstProcesses(data);
    mainLoop(data);

    setInterval(() => {
        mainLoop(data);
    }, 60);

});

socket.on('assignPlayerIdPos', (data) => {
    pid = data.pid;
    console.log(pid);
    createPlayer(data.pid, data.x, data.y);
});

socket.on("playerUpdate", (playerData) => {
    updatePlayers(playerData);
});

function updatePlayers(playerData) {
    players[pid].x = playerData[pid].x;
    players[pid].y = playerData[pid].y;
    for (const id in playerData) {
        if (id in players) {
            players[id].x = playerData[id].x;
            players[id].y = playerData[id].y;
        } else {
            players[id] = playerData[id];
        }
    }
}

function createPlayer(id, x, y) {
    players[id] = {
        x: x,
        y: y
    };
}

const firstProcesses = (map) => {
    const playerId = socket.id;
    const player = players[playerId];
    socket.emit("playerMove", player);

    loadImage(map);
    vScreen.width = (map.TILESIZE * map.MAP_WIDTH);
    vScreen.height = (map.TILESIZE * map.MAP_HEIGHT);

    canvasSize(map);
    window.addEventListener("resize", () => { canvasSize(map); });
};

const loadImage = (map) => {
    mapImg = new Image();
    mapImg.src = map.MAP_IMG_PATH;

    chrImg = new Image();
    chrImg.src = img.chr;
};

const canvasSize = (map) => {
    const c = document.querySelector('#canvas');
    c.width = window.innerWidth / 1.15;
    c.height = window.innerHeight / 1.15;

    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = ctx.msImageSmoothingEnabled = SMOOTH;

    rWidth = c.width;
    rHeight = c.height;

    if (rWidth / (map.TILESIZE * map.MAP_WIDTH) < rHeight / (map.TILESIZE * map.MAP_HEIGHT)) {
        rHeight = rWidth * (map.TILESIZE * map.MAP_HEIGHT) / (map.TILESIZE * map.MAP_WIDTH);
    } else {
        rWidth = rHeight * (map.TILESIZE * map.MAP_WIDTH) / (map.TILESIZE * map.MAP_HEIGHT);
    }
};

const mainLoop = (map) => {
    realPaint(map);
    addEventListener("keydown", keydownfunc, false);
    addEventListener("keyup", keyupfunc, false);
    keyInput(map);
    KeyOutput(defaultMoveSpeed);
    /*
    requestAnimationFrame(() => {
        mainLoop(map);
    });
    */

};

const realPaint = (map) => {
    vtrPaint(map);

    const c = document.querySelector('#canvas');
    const ctx = c.getContext("2d");

    ctx.drawImage(vScreen, 0, 0, vScreen.width, vScreen.height, 0, 0, rWidth, rHeight);
};

const vtrPaint = (map) => {
    const ctx = vScreen.getContext("2d");
    paintAll(ctx, map);
};


const paintAll = (ctx, map) => {
    paintField(ctx, map);
    //console.log(players);
    for (const id in players) {
        const player = players[id];
        ctx.drawImage(chrImg, player.x, player.y);
    }
};

const paintField = (ctx, map) => {
    for (let dy = 0; dy < map.map.length; dy++) {
        for (let dx = 0; dx < map.map[dy].length; dx++) {
            paintMapTile(ctx, mapImg, map.TILESIZE, map.TILECOLUMN, dy, dx, map.map[dy][dx]);
        }
    }
};

const paintMapTile = (ctx, map, ts, tc, dy, dx, idx) => {
    ctx.drawImage(
        map,
        ts * (idx % tc), ts * Math.floor(idx / tc), ts, ts,
        ts * dx, ts * dy, ts, ts
    );
};

const keyInput = (map) => {
    if (playerMove === 0) {
        const { left, right, up, down } = key;
        const x = players[pid].x / map.TILESIZE;
        const y = players[pid].y / map.TILESIZE;

        if (left && map.moveAllow.includes(map.map[y][x - 1])) {
            playerMove = map.TILESIZE;
            key.push = 'left';
        }
        if (right && map.moveAllow.includes(map.map[y][x + 1])) {
            playerMove = map.TILESIZE;
            key.push = 'right';
        }
        if (up && y > 0 && map.moveAllow.includes(map.map[y - 1][x])) {
            playerMove = map.TILESIZE;
            key.push = 'up';
        }
        if (down && y < map.MAP_WIDTH - 1 && map.moveAllow.includes(map.map[y + 1][x])) {
            playerMove = map.TILESIZE;
            key.push = 'down';
        }
    }
};

const KeyOutput = (moveSpeed) => {
    if (playerMove > 0) {
        playerMove -= moveSpeed;
        const playerId = socket.id;
        const player = players[playerId];
        if (key.push === 'left') player.x -= moveSpeed;
        if (key.push === 'up') player.y -= moveSpeed;
        if (key.push === 'right') player.x += moveSpeed;
        if (key.push === 'down') player.y += moveSpeed;
        //socket.emit("testdata", { x: players[pid].x, y: players[pid].y });
        socket.emit("playerMove", player);
        //console.log(player.x + "|" + player.y);
    }
};

const keydownfunc = (event) => {
    let key_code = event.keyCode;
    if (key_code === 37) key.left = true;
    if (key_code === 38) key.up = true;
    if (key_code === 39) key.right = true;
    if (key_code === 40) key.down = true;
    event.preventDefault();
};

const keyupfunc = (event) => {
    let key_code = event.keyCode;
    if (key_code === 37) key.left = false;
    if (key_code === 38) key.up = false;
    if (key_code === 39) key.right = false;
    if (key_code === 40) key.down = false;
};

