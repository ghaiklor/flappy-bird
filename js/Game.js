(function() {
    var initializeGame = function initializeGame() {
        //GAME CONSTANTS
        var DEBUG_MODE = false,
            SPEED = 180,
            GRAVITY = 1800,
            BIRD_FLAP = 550,
            TOWER_SPAWN_INTERVAL = 2000,
            AVAILABLE_SPACE_BETWEEN_TOWERS = 130,
            CLOUDS_SHOW_MIN_TIME = 5000,
            CLOUDS_SHOW_MAX_TIME = 10000,
            MAX_DIFFICULT = 50,
            SCENE = '',
            TITLE_TEXT = "FLAPPY BIRD",
            INSTRUCTIONS_TEXT = "TOUCH\nTO\nFLY",
            INSTRUCTIONS_TEXT_GAME_OVER = "TOUCH\nFOR GO\nBACK",
            ABOUT_TEXT = "Developer\nEugene Obrezkov\nghaiklor@gmail.com\n\n\nGraphic\nDima Lezhenko",
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
            TitleText, InstructionsText, AboutText, ScoreText, HighScoreText,

            //VARIABLES FOR GAME-MANAGEMENT
            isGameStarted = false,
            isGameOver = false,
            gameScore = 0;

        //on Preload I load assets
        function onPreloadGame() {
            //Loading spritesheets and set sizes of one frame
            //Phaser automatically create and crop spritesheet to animated
            Game.load.spritesheet('bird', 'img/bird.png', 48, 34);
            Game.load.spritesheet('clouds', 'img/clouds.png', 128, 64);
            Game.load.spritesheet('rain', 'img/rain.png', 17, 17);

            //Just loads image of fence and tower
            Game.load.image('fence', 'img/fence.png');
            Game.load.image('tower', 'img/tower.png');

            //Loading audio
            Game.load.audio('flap', 'wav/flap.wav');
            Game.load.audio('hurt', 'wav/hurt.wav');
            Game.load.audio('score', 'wav/score.wav');
        }

        //Initialize game
        //Creating all game objects and mainMenu
        //For start point
        function onCreateGame() {
            createBackground();
            createClouds();
            createRain();
            createTowers(true);
            createBird();
            createCamera();
            createFence();
            createSounds();
            createTexts();
            createControls();
            mainMenu();
        }

        //Lifecycle of game
        function onUpdateGame() {
            //If game is started
            if (isGameStarted) {
                //Get current bird's velocity plus our BIRD_FLAP velocity
                //I need this for calculate bird's angle
                var divingInAir = BIRD_FLAP + Bird.body.velocity.y;
                //Calculate Bird's angle
                Bird.angle = (90 * divingInAir / BIRD_FLAP) - 180;
                //If this angle < -30 then
                //set -30
                //it's our minimum value
                if (Bird.angle < -30) {
                    Bird.angle = -30;
                } else if (Bird.angle > 30) {
                    //And our maximum value
                    Bird.angle = 30;
                }

                //If game over in started game
                if (isGameOver) {
                    //Then set bird's angle to 180
                    //Towards up
                    Bird.angle = 180;
                    //Stop all animations
                    Bird.animations.stop();
                    //And set animation's frame to 3
                    Bird.frame = 3;
                } else {
                    //If GameOver or Bird collide with top or bottom world then call gameOver()
                    if (!isGameOver && (Bird.body.bottom >= Game.world.bounds.bottom - 32 || Bird.body.top <= Game.world.bounds.top)) {
                        gameOver();
                    }

                    //Check collision our Bird with Towers group
                    //If collision then call gameOver function
                    Game.physics.overlap(Bird, Towers, gameOver);

                    //Check collision our Bird with our "triggers"
                    //And if collide then add score
                    Game.physics.overlap(Bird, FreeSpacesInTowers, addScore);
                }

                //For each tower
                //Check if it visible
                //If not then kill it
                Towers.forEachAlive(function(tower) {
                    if (tower.x + tower.width < Game.world.bounds.left) {
                        tower.kill();
                    }
                });

            } else {
                //If game not started
                //Then make some animation for bird
                //Game.time.now == 0 in start
                //0 / 400 == 0
                //Cos(0) == 1
                //Cos(1) == 0
                //In result soft amplitude for Bird.y and Bird.x
                Bird.y = (Game.world.height / 2) + Game.world.height / 4 * Math.cos(Game.time.now / 1000);
                Bird.x = (Game.world.width / 10) + 32 * Math.sin(Game.time.now / 2000);
            }

            //Every update tick need check if clouds go from camera
            //And remove it
            Clouds.forEachAlive(function(cloud) {
                if (cloud.x + cloud.width < Game.world.bounds.left) {
                    cloud.kill();
                }
            });

            //If game not over
            if (!isGameOver) {
                //Animate our Fence tilePosition
                Fence.tilePosition.x -= Game.time.physicsElapsed * SPEED / 2;
            }

            if (!isGameStarted || isGameOver) {
                //Give effect for texts
                // TitleText.scale.setTo(1 + 0.1 * Math.cos(Game.time.now / 100), 1 + 0.1 * Math.sin(Game.time.now / 100));
                TitleText.angle = 10 * Math.cos(Game.time.now / 300);
                InstructionsText.scale.setTo(1 + 0.1 * Math.cos(Game.time.now / 1000), 1 + 0.1 * Math.sin(Game.time.now / 100));
            }
        }

        //It's helper for me
        //Here I draw sprite bodies
        //For checks collision visually
        function onRenderGame() {
            //And draw it only in Debug mode
            if (DEBUG_MODE) {
                Game.debug.renderCameraInfo(Game.camera, 32, 32);
                Game.debug.renderSpriteBody(Bird);
                Game.debug.renderSpriteBounds(Bird);
                Game.debug.renderSpriteCorners(Bird, true, true);

                Game.debug.renderQuadTree(Game.physics.quadTree);

                Towers.forEachAlive(function(tower) {
                    Game.debug.renderSpriteBody(tower);
                    Game.debug.renderSpriteCorners(tower, true, true);
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
            //TODO: make normal background
            Background.beginFill(0x4E5B61, 1);
            // And draw fullyscreen rectangle
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

        function createRain() {
            //Create new emitter
            var emitter = Game.add.emitter(Game.world.centerX, 0, 400);
            //Set emitter full width
            emitter.width = Game.world.width;
            emitter.angle = 0;
            //And make particles from rain spritesheer
            emitter.makeParticles('rain');
            //Set scaling
            emitter.maxParticleScale = 0.7;
            emitter.minParticleScale = 0.1;
            //And speed
            emitter.setYSpeed(300, 500);
            emitter.setXSpeed(-5, 5);
            emitter.minRotation = 0;
            emitter.maxRotation = 0;
            emitter.gravity = GRAVITY;
            emitter.start(false, 1600, 5, 0);
        }

        /**
         * Create towers
         */
        function createTowers(firstRun) {
            //Calculate difficult coefficient
            //More play - more difficult
            function getFreeSpaceInTower() {
                return AVAILABLE_SPACE_BETWEEN_TOWERS + 60 * ((gameScore > MAX_DIFFICULT ? MAX_DIFFICULT : MAX_DIFFICULT - gameScore) / MAX_DIFFICULT);
            }

            //Make tower based on towerY
            //If isFlipped then create flipped tower for top
            function makeNewTower(towerY, isFlipped) {
                //Create new element in Towers Groups
                //x - appears from right
                //y - if need flipped then substract from difficult. In other case plus
                //sprite - and just load asset with tower png
                var tower = Towers.create(Game.world.width, towerY + (isFlipped ? -getFreeSpaceInTower() : getFreeSpaceInTower()) / 2, 'tower');

                //Disable gravity for it
                tower.body.allowGravity = false;
                //Scale tower twice
                //x - 2
                //y - if need flipped then can use negative value and Phaser rotate it
                tower.scale.setTo(2, isFlipped ? -2 : 2);
                //Set top offset for hiding other part of asset for flipped tower
                //As our asset 512px in height then we need move up our rotated tower
                tower.body.offset.y = isFlipped ? -tower.body.height * 2 : 0;
                //Set tower negative speed
                tower.body.velocity.x = -SPEED;
                //And return tower object for using in makeTowers()
                return tower;
            }

            //This function create towers for top and bottom
            function makeTowers() {
                //Generate random Y for tower
                //Get world's height and substract it from difficult divided by 2
                //And plus it to random height / 6
                //First part get towerY on difficult
                //Second part change towerY higher of lower
                //For example
                //(600 (world's height) - 16 (sprite's size / 2) - 60 (gameScore == 0) / 2) / 2) + (-1 || 1) * (0...1) * 600 / 6
                //277 + 25.6 - first possible variant of towerY
                //600 - 16 + 100 - second possible variant of towerY
                //and go on...
                var towerY = ((Game.world.height - 16 - getFreeSpaceInTower() / 2) / 2) + (Math.random() > 0.5 ? -1 : 1) * Math.random() * Game.world.height / 6,
                    //Create bottom tower from towerY
                    bottomTower = makeNewTower(towerY),
                    //Create flipped tower for towerY
                    topTower = makeNewTower(towerY, true);

                //Create our "trigger", area between towers
                //And place it at end of tower
                var spaceInTower = FreeSpacesInTowers.create(topTower.x + topTower.width, 0);
                //Set width to it 2 - this enough
                spaceInTower.width = 2;
                //Set full-height for can be triggered for sure
                spaceInTower.height = Game.world.height;
                //Disable gravity
                spaceInTower.body.allowGravity = false;
                //And set velocity to negative game's speed
                spaceInTower.body.velocity.x = -SPEED;

                //Spawn towers every interval
                TowersTimer.add(TOWER_SPAWN_INTERVAL, makeTowers, this);
            }

            if (firstRun) {
                //Create new Towers Group
                Towers = Game.add.group();
                //Create group for elements
                //which will inserted in area between towers
                //This elements will be our triggers for score game
                FreeSpacesInTowers = Game.add.group();
            } else {
                //Create new TowerTimer with autodestroy set to false again
                TowersTimer = Game.time.create(false);
                //Add TimerEvent for makeTowers method
                TowersTimer.add(TOWER_SPAWN_INTERVAL, makeTowers, this);
                //Start timer
                TowersTimer.start();
            }
        }

        /**
         * Create main actor of our game - A FUCKING BIRD
         * I have a lot problems with bird's physics
         */
        function createBird() {
            //Add Bird's sprite to scene
            Bird = Game.add.sprite(0, 0, 'bird');
            //Set anchor point to center of sprite
            Bird.anchor.setTo(0.5, 0.5);
            //Add animation from our spritesheet
            //Give it name 'flying' and set 4 frames
            //Framerate will be 10
            //and animation will be looped
            Bird.animations.add('flying', [0, 1, 2, 3, 2, 1, 0], 20, true);
            //Allow events for bird
            Bird.inputEnabled = true;
            //Set bird's body collide with world's bounds
            //In our case it top left, top right, etc... corners of browser
            Bird.body.collideWorldBounds = true;
            //Set gravity for bird
            Bird.body.gravity.y = GRAVITY;
        }

        /**
         * Create camera
         */
        function createCamera() {
            Game.camera.follow(Bird);
        }

        /**
         * Create Fence in game, just for fun and beauty
         */
        function createFence() {
            //Create tiled sprite
            //x1 - from left
            //y1 - world's height - sprite's height * 2
            //x2 - to right
            //y2 - and sprite's height * 2
            //asset - what load to this tile
            //We drawing a rectangle with this sprite
            Fence = Game.add.tileSprite(0, Game.world.height - 32, Game.world.width, 32, 'fence');
            //Scale fence twice
            Fence.tileScale.setTo(2, 2);
        }

        /**
         * Our GODNESS sounds in wav-format just need add to game as GOD say
         */
        function createSounds() {
            //Just loading and assigning it to variables
            //Not interesting
            FlapSound = Game.add.audio('flap');
            ScoreSound = Game.add.audio('score');
            HurtSound = Game.add.audio('hurt');
        }

        /**
         * Create Text objects for GUI
         */
        function createTexts() {
            //Create text object for showing title of game
            TitleText = Game.add.text(Game.world.width / 2, Game.world.height / 3, TITLE_TEXT, {
                font: '32px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            });
            //Set anchor to text's center
            TitleText.anchor.setTo(0.5, 0.5);

            //Create text with author
            AboutText = Game.add.text(Game.world.width - 10, 10, ABOUT_TEXT, {
                font: '12px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 1,
                align: 'center'
            });
            //Set anchor to right for set text in right corner
            AboutText.anchor.x = 1;

            //Create text object with our future score showing
            //And I place it in centerH and higherV
            ScoreText = Game.add.text(Game.world.width / 2, Game.world.height / 3, "0", {
                font: '32px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            });
            //Set anchor to center of text
            ScoreText.anchor.setTo(0.5, 0.5);

            //Create text object with instruction what to do
            //i.e. Touch Bird to start game
            InstructionsText = Game.add.text(Game.world.width / 2, Game.world.height - Game.world.height / 3, INSTRUCTIONS_TEXT, {
                font: '16px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 1,
                align: 'center'
            });
            //Set anchor to center of text
            InstructionsText.anchor.setTo(0.5, 0.5);

            //Create text object for showing highscore and your score
            HighScoreText = Game.add.text(Game.world.width / 2, Game.world.height / 3, "", {
                font: '24px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 1,
                align: 'center'
            });
            //Set anchor to text's center again and again and again...
            //Fucking anchor, I hate you
            HighScoreText.anchor.setTo(0.5, 0.5);
        }

        /**
         * Make some interactivity
         * And create all needed controls
         */
        function createControls() {
            //Here I just assign method to execute when user press mousedown or touch screen
            Game.input.onDown.add(flyBirdFuckWhyAreYouNotFlyingBitch);
        }

        /**
         * This magic function make bird flying
         * DON'T RENAME IT, IT'S JUST WORKING AND ALL
         */
        function flyBirdFuckWhyAreYouNotFlyingBitch() {
            //Checks if game started
            //If not started then this click we need startGame
            if (!isGameStarted) {
                startGame();
                Bird.body.velocity.y = -BIRD_FLAP;
                FlapSound.play();
            } else if (!isGameOver) {
                //Else if game started and game not overs
                //Set Bird's velocity up in negative value
                //And yep, she's go up
                Bird.body.velocity.y = -BIRD_FLAP;
                //Also not forgot to play our FlapSound
                FlapSound.play();
            } else if (isGameOver) {
                //And if game over
                //Then click or touch
                //Will run game again
                mainMenu();
            }
        }

        //Count player's score
        //spaceInTower param need for removing it from group
        //when bird fly over it
        //First argument not needed
        //SAT.Response send "trigger" in second argument
        function addScore(_, spaceInTower) {
            //Remove space from group
            FreeSpacesInTowers.remove(spaceInTower);
            //Increase game's score by one
            ++gameScore;
            //Set text to ScoreText with updated score
            ScoreText.setText(gameScore);
            //And play ScoreSound
            ScoreSound.play();
        }

        /**
         * This function need to set up default values for game-variables
         * And show mainMenu
         */
        function mainMenu() {
            //Update local variables
            isGameStarted = false;
            isGameOver = false;
            gameScore = 0;

            //Configure text objects
            ScoreText.renderable = false;
            HighScoreText.renderable = false;

            AboutText.setText(ABOUT_TEXT);
            TitleText.setText(TITLE_TEXT);
            InstructionsText.setText(INSTRUCTIONS_TEXT);
            AboutText.renderable = true;
            TitleText.renderable = true;
            InstructionsText.renderable = true;

            //Disable gravity for bird
            Bird.body.allowGravity = false;
            //Set angle to 0
            Bird.angle = 0;
            //Reset all bird's variables
            //And set x and y to leftX and centerV
            Bird.reset(Game.world.width / 10, Game.world.height / 2);
            //Play animation 'flying'
            Bird.animations.play('flying');

            //Remove all our "triggers"
            FreeSpacesInTowers.removeAll();
            //And towers
            Towers.removeAll();

            //Stops TowersTimer from spawning new towers in main menu
            // TowersTimer.stop();
        }

        /**
         * Initialize new Game
         */
        function startGame() {
            //Enable gravity for bird
            Bird.body.allowGravity = true;

            //Enable timer for towers
            // TowersTimer.start();
            createTowers(false);

            //Set that game is started
            isGameStarted = true;

            //Set text with current score
            ScoreText.setText(gameScore);
            ScoreText.renderable = true;

            //Disable instructions text from render
            AboutText.renderable = false;
            TitleText.renderable = false;
            InstructionsText.renderable = false;
            HighScoreText.renderable = false;
        }

        //Call it when game over
        function gameOver() {
            //Set boolean that game is over
            isGameOver = true;

            //Set for all towers velocity to 0
            Towers.forEachAlive(function(tower) {
                tower.body.velocity.x = 0;
            });

            //Set for all our "triggers" velocity to 0
            FreeSpacesInTowers.forEachAlive(function(spaceInTower) {
                spaceInTower.body.velocity.x = 0;
            });

            //Stops TowersTimer
            TowersTimer.stop();

            //Add once event to click on Bird
            //And show MainMenu
            // Bird.events.onInputDown.addOnce(mainMenu);

            //Play Hurt sound (Game is over)
            HurtSound.play();

            AboutText.renderable = false;
            TitleText.renderable = false;
            InstructionsText.renderable = true;
            ScoreText.renderable = false;
            HighScoreText.renderable = true;
            InstructionsText.setText(INSTRUCTIONS_TEXT_GAME_OVER);
            HighScoreText.setText("HIGHSCORE: " + getHighscore(gameScore) + "\n\nYOUR SCORE: " + gameScore);
        }

        /**
         * Get highscore
         * @param  {integer} score Current score
         */
        function getHighscore(score) {
            var highscore = window.localStorage.getItem('highscore');
            if (score > highscore || highscore === null) {
                highscore = score;
                window.localStorage.setItem('highscore', highscore);
            }
            return highscore;
        }
    };


    WebFont.load({
        google: {
            families: ['Press+Start+2P']
        },
        active: function() {
            initializeGame();
        }
    });
})();