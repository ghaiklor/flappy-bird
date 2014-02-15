(function() {
    //GAME CONSTANTS
    var DEBUG_MODE = true,
        SPEED = 180,
        GRAVITY = 18,
        BIRD_FLAP = 420,
        TOWER_SPAWN_INTERVAL = 2000,
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
        FreeSpacesInTowers, Towers, TowersTimer,
        Bird,
        Fence,
        FlapSound, ScoreSound, HurtSound,
        AboutText, ScoreText, InstructionsText, HighScoreText,

        //VARIABLES FOR GAME-MANAGEMENT
        isGameStarted = false,
        isGameOver = false,
        gameScore = 0;

    //on Preload I load assets
    function onPreloadGame() {
        //Loading spritesheets and set sizes of one frame
        //Phaser automatically create and crop spritesheet to animated
        Game.load.spritesheet('bird', 'img/bird.png', 24, 24);
        Game.load.spritesheet('clouds', 'img/clouds.png', 128, 64);

        //Just loads image of fence and tower
        Game.load.image('fence', 'img/fence.png');
        Game.load.image('tower', 'img/tower.png');

        //Loading audio
        Game.load.audio('flap', 'wav/flap.wav');
        Game.load.audio('hurt', 'wav/hurt.wav');
        Game.load.audio('score', 'wav/score.wav');
    }

    //Initialize game
    //Creating all game objects and resetGame
    //For start point
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

    //Lifecycle of game
    function onUpdateGame() {
        //Make Bird.damage()
        if (isGameStarted) {
            var divingInAir = BIRD_FLAP + Bird.body.velocity.y;
            Bird.angle = (90 * divingInAir / BIRD_FLAP) - 180;
            if (Bird.angle < -30) {
                Bird.angle = -30;
            }

            if (isGameOver || Bird.angle > 90 || Bird.angle < -90) {
                Bird.angle = 90;
                Bird.animations.stop();
                Bird.frame = 3;
            } else {
                Bird.animations.play('flying');
            }

            if (isGameOver) {
                if (Bird.scale.x < 4) {
                    Bird.scale.setTo(Bird.scale.x * 1.2, Bird.scale.y * 1.2);
                }
            } else {
                Game.physics.overlap(Bird, Towers, gameOver);
                if (!isGameOver && Bird.body.bottom >= Game.world.bounds.bottom) {
                    gameOver();
                }

                Game.physics.overlap(Bird, FreeSpacesInTowers, addScore);
            }

            Towers.forEachAlive(function(tower) {
                if (tower.x + tower.width < Game.world.bounds.left) {
                    tower.kill();
                }
            });
            TowersTimer.update();
        } else {
            Bird.y = (Game.world.height / 2) + 8 * Math.cos(Game.time.now / 200);
        }

        ScoreText.scale.setTo(1 + 0.1 * Math.cos(Game.time.now / 100), 1 + 0.1 * Math.sin(Game.time.now / 100));
        CloudsTimer.update();
        Clouds.forEachAlive(function(cloud) {
            if (cloud.x + cloud.width < Game.world.bounds.left) {
                cloud.kill();
            }
        });

        if (!isGameOver) {
            Fence.tilePosition.x -= Game.time.physicsElapsed * SPEED / 2;
        }
    }

    //It's helper for me
    //Here I draw sprite bodies
    //For checks collision visually
    function onRenderGame() {
        //And draw it only in Debug mode
        if (DEBUG_MODE) {
            Game.debug.renderSpriteBody(Bird);

            Towers.forEachAlive(function(tower) {
                Game.debug.renderSpriteBody(tower);
            });

            FreeSpacesInTowers.forEachAlive(function(spaceInTower) {
                Game.debug.renderSpriteBody(spaceInTower);
            });
        }
    }

    /**
     * Make background
     */
    function createBackground() {
        //Create new graphics
        Background = Game.add.graphics(0, 0);
        //Init filling color
        Background.beginFill(0xCCEEFF, 1);
        //And draw fullyscreen rectangle
        Background.drawRect(0, 0, Game.world.width, Game.world.height);
        //Close filling
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
            //Random Y for new cloud
            var cloudY = Math.random() * Game.world.height / 2,
                //Create child of Clouds group and set
                //x - from right side
                //y - random Y
                //assetName - clouds which loaded in onPreloadGame
                //frame - random value from 1 to 4 (4 frames in clouds spritesheet)
                cloud = Clouds.create(Game.world.width, cloudY, 'clouds', Math.floor(4 * Math.random())),
                //Random scaling of cloud and need plus static value
                //From prevent scaleTo(0, 0);
                cloudScale = 1 + Math.floor((3 * Math.random()));

            //Set alpha for cloud
            //For bigger clouds more alpha
            //Min value of cloudSace 2 and max value 4
            cloud.alpha = 2 / cloudScale;
            //Sets scale to cloud
            cloud.scale.setTo(cloudScale, cloudScale);
            //Disable gravity for this sprite
            cloud.body.allowGravity = false;
            //Set velocity to the left with currect game's speed
            //For bigger clouds velocity lower
            cloud.body.velocity.x = -SPEED / cloudScale;
            //Set anchor point to (0, 0.5);
            cloud.anchor.setTo(0, 0.5);

            //Add new TimerEvent in RandomRange
            //For call again this function
            CloudsTimer.add(Game.rnd.integerInRange(CLOUDS_SHOW_MIN_TIME, CLOUDS_SHOW_MAX_TIME), makeNewCloud, this);
        }

        //Create new GameGroup
        Clouds = Game.add.group();
        //Create new PhaserTimer with autodestroy false - it's important
        CloudsTimer = Game.time.create(false);
        //Call immediatly makeNewCloud function
        CloudsTimer.add(0, makeNewCloud, this);
        //And start timer
        CloudsTimer.start();
    }

    /**
     * Create towers
     */
    function createTowers() {
        function o() {
            return OPENING + 60 * ((gameScore > 50 ? 50 : 50 - gameScore) / 50);
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

            var spaceInTower = FreeSpacesInTowers.create(topTower.x + topTower.width, 0);
            spaceInTower.width = 2;
            spaceInTower.height = Game.world.height;
            spaceInTower.body.allowGravity = false;
            spaceInTower.body.velocity.x = -SPEED;

            TowersTimer.add(TOWER_SPAWN_INTERVAL, makeTowers, this);
        }

        Towers = Game.add.group();
        TowersTimer = Game.time.create(false);
        TowersTimer.add(TOWER_SPAWN_INTERVAL, makeTowers, this);
        TowersTimer.start();

        FreeSpacesInTowers = Game.add.group();
    }

    /**
     * Create main actor of our game - A FUCKING BIRD, MUHAHAHA
     */
    function createBird() {
        Bird = Game.add.sprite(0, 0, 'bird');
        Bird.alive = true;
        Bird.health = 5;
        Bird.anchor.setTo(0.5, 0.5);
        Bird.scale.setTo(2, 2);
        Bird.animations.add('flying', [0, 1, 2, 3], 10, true);
        Bird.inputEnabled = true;
        Bird.body.collideWorldBounds = true;
        Bird.body.gravity.y = GRAVITY;
        Bird.body.mass = 2;
        Bird.body.speed = 10;
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
        AboutText = Game.add.text(Game.world.width / 20, 10, 'Eugene Obrezkov\nghaiklor@gmail.com', {
            font: '15px "Press Start 2P"',
            fill: '#000000',
            align: 'center'
        });
        AboutText.anchor.x = 0.5;

        ScoreText = Game.add.text(Game.world.width / 2, Game.world.height / 5, "", {
            font: '32px "Press Start 2P"',
            fill: '#FFFFFF',
            stroke: '#443300',
            strokeThickness: 8,
            align: 'center'
        });
        ScoreText.anchor.setTo(0.5, 0.5);

        InstructionsText = Game.add.text(Game.world.width / 2, Game.world.height - Game.world.height / 4, "", {
            font: '16px "Press Start 2P"',
            fill: '#fff',
            stroke: '#430',
            strokeThickness: 8,
            align: 'center'
        });
        InstructionsText.anchor.setTo(0.5, 0.5);

        HighScoreText = Game.add.text(Game.world.width / 2, Game.world.height / 3, "", {
            font: '24px "Press Start 2P"',
            fill: '#fff',
            stroke: '#430',
            strokeThickness: 8,
            align: 'center'
        });
        HighScoreText.anchor.setTo(0.5, 0.5);
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
        gameScore = 0;
        ScoreText.setText('FLAPPY BIRD');
        InstructionsText.setText("TOUCH TO\nFLY");
        HighScoreText.renderable = false;
        Bird.body.allowGravity = false;
        Bird.angle = 0;
        Bird.reset(Game.world.width / 4, Game.world.height / 2);
        Bird.scale.setTo(2, 2);
        Bird.animations.play('flying');
        FreeSpacesInTowers.removeAll();
        Towers.removeAll();
        TowersTimer.stop();
    }

    /**
     * Initialize new Game
     */
    function startGame() {
        Bird.body.allowGravity = true;
        TowersTimer.start();
        isGameStarted = true;
        ScoreText.setText(gameScore);
        InstructionsText.renderable = false;
    }

    function gameOver() {
        isGameOver = true;
        Towers.forEachAlive(function(tower) {
            tower.body.velocity.x = 0;
        });
        FreeSpacesInTowers.forEachAlive(function(spaceInTower) {
            spaceInTower.body.velocity.x = 0;
        });
        TowersTimer.stop();
        Bird.events.onInputDown.addOnce(resetGame);
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
            Bird.body.velocity.y = -BIRD_FLAP;
            FlapSound.play();
        }
    }

    function addScore(spaceInTower) {
        FreeSpacesInTowers.remove(spaceInTower);
        ++gameScore;
        ScoreText.setText(gameScore);
        ScoreSound.play();
    }
})();