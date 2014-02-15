(function() {
    //GAME CONSTANTS
    var DEBUG = true,
        SPEED = 180,
        GRAVITY = 18,
        FLAP = 420,
        SPAWN_RATE = 1 / 1.2,
        OPENING = 144,
        CLOUDS_SHOW_MIN_TIME = 5000,
        CLOUDS_SHOW_MAX_TIME = 10000,
        SCENE = '',
        WINDOW_WIDTH = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth,
        WINDOW_HEIGHT = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;

    //MAIN GAME VARIABLE
    var Game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.AUTO, SCENE, {
        preload: onPreloadGame,
        create: onCreateGame,
        update: onUpdateGame,
        render: onRenderGame
    }),
        //HELPER VARIABLES FOR SAVING GAME-OBJECTS
        Background,
        Clouds, CloudsTimer,
        Towers, TowersTimer,
        Bird,
        Fence,
        FlapSound, ScoreSound, HurtSound,
        AboutText, ScoreText,

        //VARIABLES FOR GAME-MANAGEMENT
        isGameStarted = false,
        isGameOver = false,
        gameScore = 0;

    function onPreloadGame() {
        Game.load.spritesheet('bird', 'img/bird.png', 24, 24);
        Game.load.spritesheet('clouds', 'img/clouds.png', 128, 64);

        Game.load.image('fence', 'img/fence.png');
        Game.load.image('tower', 'img/tower.png');

        Game.load.audio('flap', 'wav/flap.wav');
        Game.load.audio('hurt', 'wav/hurt.wav');
        Game.load.audio('score', 'wav/score.wav');
    }

    function onCreateGame() {
        createBackground();
        createClouds();
        createTowers();
        createBird();
        createFence();
        createSounds();
        createTexts();
        createControls();
        resetGame();
    }

    function onUpdateGame() {
        if (isGameStarted) {
            var dvy = FLAP + Bird.body.velocity.y;
            Bird.angle = (90 * dvy / FLAP) - 180;
            if (Bird.angle < -30) {
                Bird.angle = 30;
            }

            if (isGameOver || Bird.angle > 90 || Bird.angle < -90) {
                Bird.angle = 90;
                Bird.animations.stop();
                Bird.frame = 3;
            } else {
                Bird.animations.play('flying');
            }
        } else if (isGameOver) {
            if (Bird.scale.x < 4) {
                Bird.scale.setTo(Bird.scale.x * 1.2, Bird.scale.y * 1.2);
            }
        } else {
            Game.physics.overlap(Bird, Towers);
        }

        Towers.forEachAlive(function(tower) {
            if (tower.x + tower.width < Game.world.bounds.left) {
                tower.kill();
            }
        });

        Clouds.forEachAlive(function(cloud) {
            if (cloud.x + cloud.width < Game.world.bounds.left) {
                cloud.kill();
            }
        });
    }

    function onRenderGame() {
        if (DEBUG) {
            Game.debug.renderSpriteBody(Bird);
            Towers.forEachAlive(function(tower) {
                Game.debug.renderSpriteBody(tower);
            });
        }
    }

    /**
     * Fills background
     */
    function createBackground() {
        Background = Game.add.graphics(0, 0);
        Background.beginFill(0xCCEEFF, 1);
        Background.drawRect(0, 0, Game.world.width, Game.world.height);
        Background.endFill();
    }

    /**
     * Create clouds
     */
    function createClouds() {
        /**
         * Make new cloud every tick in timer
         */
        function makeNewCloud() {
            var cloudY = Math.random() * Game.world.height / 2,
                cloud = Clouds.create(Game.world.width, cloudY, 'clouds', Math.floor(4 * Math.random())),
                cloudScale = 2 + 2 * Math.random();

            cloud.alpha = 2 / cloudScale;
            cloud.scale.setTo(cloudScale, cloudScale);
            cloud.body.allowGravity = false;
            cloud.body.velocity.x = -SPEED / cloudScale;
            cloud.anchor.y = 0;

            CloudsTimer.add(Game.rnd.integerInRange(CLOUDS_SHOW_MIN_TIME, CLOUDS_SHOW_MAX_TIME), makeNewCloud, this);
        }

        Clouds = Game.add.group();
        CloudsTimer = Game.time.create(false);
        CloudsTimer.add(0, makeNewCloud, this);
        CloudsTimer.start();
    }

    /**
     * Create towers (our colliders)
     */
    function createTowers() {
        function o() {
            return OPENING + 60 * ((score > 50 ? 50 : 50 - score) / 50);
        }

        function makeNewTower(towerY, isFlipped) {
            var tower = Towers.create(Game.world.width, towerY + (isFlipped ? -o() : o()) / 2, 'tower');

            tower.body.allowGravity = false;
            tower.scale.setTo(2, isFlipped ? -2 : 2);
            tower.body.offset.y = isFlipped ? -tower.body.height * 2 : 0;
            tower.body.velocity.x = -SPEED;
            return tower;
        }

        function makeTowers() {
            var towerY = ((Game.world.height - 16 - o() / 2) / 2) + (Math.random() > 0.5 ? -1 : 1) * Math.random() * Game.world.height / 6,
                bottomTower = makeNewTower(towerY),
                topTower = makeNewTower(towerY, true);
        }

        Towers = Game.add.group();
        TowersTimer = new Phaser.Timer(Game);
        TowersTimer.add(1 / SPAWN_RATE, makeNewTower);
    }

    /**
     * Create main actor of our game - A FUCKING BIRD, MUHAHAHA
     */
    function createBird() {
        Bird = Game.add.sprite(20, 20, 'bird');
        Bird.anchor.setTo(0.5, 0.5);
        Bird.scale.setTo(2, 2);
        Bird.animations.add('flying', [0, 1, 2, 3], 10, true);
        Bird.inputEnabled = true;
        Bird.body.collideWorldBounds = true;
        Bird.body.gravity.y = GRAVITY;
    }

    /**
     * Create Fence in game, just for fun and beauty
     */
    function createFence() {
        Fence = Game.add.tileSprite(0, Game.world.height - 32, Game.world.width, 32, 'fence');
        Fence.tileScale.setTo(2, 2);
    }

    /**
     * Our GODNESS sounds in wav-format just need add to game as GOD say
     */
    function createSounds() {
        FlapSound = Game.add.audio('flap');
        ScoreSound = Game.add.audio('score');
        HurtSound = Game.add.audio('hurt');
    }

    /**
     * Create Text objects for GUI
     */
    function createTexts() {
        AboutText = Game.add.text(Game.world.width / 2, 10, 'Eugene Obrezkov\nghaiklor@gmail.com', {
            font: 'Arial',
            fill: '#FFFFFF',
            align: 'center'
        });
        AboutText.text.anchor.x = 0.5;
    }

    /**
     * Make some interactivity
     * And create all needed controls
     */
    function createControls() {
        Game.input.onDown.add(flyBirdFuckWhyAreYouNotFlyingBitch);
    }

    /**
     * This function need to set up default values for game-variables
     * Start new game in other words
     */
    function resetGame() {
        isGameStarted = false;
        isGameOver = false;
        Bird.body.allowGravity = false;
        Bird.angle = 0;
        Bird.reset(Game.world.width / 4, Game.world.height / 2);
        Bird.animations.play('flying');
        Towers.removeAll();
    }

    /**
     * Initialize new Game
     */
    function startGame() {
        Bird.body.allowGravity = true;
        TowersTimer.start();
        isGameStarted = true;
    }

    function gameOver() {
        isGameOver = true;
        Towers.forEachAlive(function(tower) {
            tower.body.velocity.x = 0;
        });
        HurtSound.play();
    }

    /**
     * This magic function make bird flying
     * DON'T RENAME IT, IT'S JUST WORKING AND ALL
     */
    function flyBirdFuckWhyAreYouNotFlyingBitch() {
        if (!isGameStarted) {
            startGame();
        } else if (!isGameOver) {
            Bird.body.velocity.y = -FLAP;
            FlapSound.play();
        } else {

        }
    }
})();