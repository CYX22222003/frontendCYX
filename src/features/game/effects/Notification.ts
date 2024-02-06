import { Layer } from 'src/features/game/layer/GameLayerTypes';

import FontAssets from '../assets/FontAssets';
import SoundAssets from '../assets/SoundAssets';
import { Constants, screenCenter } from '../commons/CommonConstants';
import { BitmapFontStyle, IBaseScene } from '../commons/CommonTypes';
import dialogueConstants from '../dialogue/GameDialogueConstants';
import DialogueRenderer from '../dialogue/GameDialogueRenderer';
import SourceAcademyGame from '../SourceAcademyGame';
import { sleep } from '../utils/GameUtils';
import { createBitmapText } from '../utils/TextUtils';
import { fadeAndDestroy, fadeIn } from './FadeEffect';
//CYX: create input manager
import GameInputManager from '../input/GameInputManager';

const notifStyle: BitmapFontStyle = {
  key: FontAssets.alienLeagueFont.key,
  size: 100,
  align: Phaser.GameObjects.BitmapText.ALIGN_CENTER
};

const notifTextConfig = {
  x: screenCenter.x,
  y: dialogueConstants.rect.y + notifStyle.size * 2,
  oriX: 0.5,
  oriY: 0.9
};

/**
 * A function to display a notifications such as location-change notification
 *
 * @param scene scene to attach this message to
 * @param message - the string you want to display
 * @returns {Promise} - a promise that resolves when notification is clicked
 */
export async function displayNotification(scene: IBaseScene, message: string): Promise<void> {
  const dialogueRenderer = new DialogueRenderer({});
  const container = dialogueRenderer.getDialogueContainer();
  

  scene.getLayerManager().addToLayer(Layer.Effects, container);
  scene.getLayerManager().fadeInLayer(Layer.Effects);

  const notifText = createBitmapText(scene, message, notifTextConfig, notifStyle).setAlpha(0);
  container.add(notifText);

  SourceAcademyGame.getInstance().getSoundManager().playSound(SoundAssets.notifEnter.key);
  scene.add.tween(fadeIn([notifText], Constants.fadeDuration * 2));

  // Wait for fade in to finish
  await sleep(Constants.fadeDuration * 2);

  //CYX: create Keyboard shortcut for switching between Location to Menu mode
  
  const showNotification = new Promise<void>(resolve => {
    const KeyboardManager = new GameInputManager(scene);
    KeyboardManager.enableKeyboardInput(true);
    KeyboardManager.registerKeyboardListener(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      "up",
      async () => {
        //console.log("notification pressed");
        KeyboardManager.clearKeyboardListener(Phaser.Input.Keyboard.KeyCodes.SPACE);
        SourceAcademyGame.getInstance().getSoundManager().playSound(SoundAssets.notifExit.key);
        fadeAndDestroy(scene, notifText, { fadeDuration: Constants.fadeDuration / 4 });
        dialogueRenderer.destroy();
        resolve();
      }
    )

    dialogueRenderer.getDialogueBox().on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      SourceAcademyGame.getInstance().getSoundManager().playSound(SoundAssets.notifExit.key);
      fadeAndDestroy(scene, notifText, { fadeDuration: Constants.fadeDuration / 4 });
      dialogueRenderer.destroy();
      resolve();
    });
  });

  await showNotification;
}
