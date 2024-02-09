import SoundAssets from '../assets/SoundAssets';
import { ItemId } from '../commons/CommonTypes';
import { promptWithChoices } from '../effects/Prompt';
import { Layer } from '../layer/GameLayerTypes';
import GameGlobalAPI from '../scenes/gameManager/GameGlobalAPI';
import SourceAcademyGame from '../SourceAcademyGame';
import { textTypeWriterStyle } from './GameDialogueConstants';
import DialogueGenerator from './GameDialogueGenerator';
import DialogueRenderer from './GameDialogueRenderer';
import DialogueSpeakerRenderer from './GameDialogueSpeakerRenderer';
import GameInputManager from '../input/GameInputManager'; 

/**
 * Given a dialogue Id, this manager renders the correct dialogue.
 * It displays the lines, speakers, and performs actions
 * whenever players click on the dialogue box
 */


export default class DialogueManager{
  private speakerRenderer?: DialogueSpeakerRenderer;
  private dialogueRenderer?: DialogueRenderer;
  private dialogueGenerator?: DialogueGenerator;
  //CYX: try to enable keyboard input
  private KeyBoardManager? : GameInputManager = 
  new GameInputManager(GameGlobalAPI.getInstance().getGameManager());

  /**
   * @param dialogueId the dialogue Id of the dialogue you want to play
   *
   * @returns {Promise} the promise that resolves when the entire dialogue has been played
   */
  public async showDialogue(dialogueId: ItemId): Promise<void> {
    const dialogue = GameGlobalAPI.getInstance().getDialogueById(dialogueId);

    this.dialogueRenderer = new DialogueRenderer(textTypeWriterStyle);
    this.dialogueGenerator = new DialogueGenerator(dialogue.content);
    this.speakerRenderer = new DialogueSpeakerRenderer();
    GameGlobalAPI.getInstance().addToLayer(
      Layer.Dialogue,
      this.dialogueRenderer.getDialogueContainer()
    );

    GameGlobalAPI.getInstance().fadeInLayer(Layer.Dialogue);
    await new Promise(resolve => this.playWholeDialogue(resolve as () => void));
    this.getDialogueRenderer().destroy();
    this.getSpeakerRenderer().changeSpeakerTo(null);
  }

  private async playWholeDialogue(resolve: () => void) {
    await this.showNextLine(resolve);
     this.getKeyBoardManager().enableKeyboardInput(true);
     // CYX: modification, issues: this may tend to skip some lines, especially in the teleportation bay
     this.getKeyBoardManager()
     .registerKeyboardListener(
       Phaser.Input.Keyboard.KeyCodes.SPACE, 'up', async () => {
         await this.showNextLine(resolve);
         console.log('Space key pressed!');   
       }
     );

    
    
    //CYX: remove keyboard listener

    this.getDialogueRenderer()
      .getDialogueBox()
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, async () => {
        await this.showNextLine(resolve);
        console.log("click");
      });
  }

  private async showNextLine(resolve: () => void) {
    GameGlobalAPI.getInstance().playSound(SoundAssets.dialogueAdvance.key);
    const { line, speakerDetail, actionIds, prompt } =
      await this.getDialogueGenerator().generateNextLine();
    const lineWithName = line.replace('{name}', this.getUsername());
    this.getDialogueRenderer().changeText(lineWithName);
    this.getSpeakerRenderer().changeSpeakerTo(speakerDetail);

    // Store the current line into the storage
    GameGlobalAPI.getInstance().storeDialogueLine(lineWithName, speakerDetail);

    // Disable interactions while processing actions
    GameGlobalAPI.getInstance().enableSprite(this.getDialogueRenderer().getDialogueBox(), false);
    if (prompt) {
      const response = await promptWithChoices(
        GameGlobalAPI.getInstance().getGameManager(),
        prompt.promptTitle,
        prompt.choices.map(choice => choice[0])
      );
      this.getDialogueGenerator().updateCurrPart(prompt.choices[response][1]);
    }
    await GameGlobalAPI.getInstance().processGameActionsInSamePhase(actionIds);
    GameGlobalAPI.getInstance().enableSprite(this.getDialogueRenderer().getDialogueBox(), true);
    //CYX: clear all keyboardlistenrs for Keycodes A when the dialogue is finished 
    // to prevent an accumulation of keyboard listners
    if (!line) {
      this.getKeyBoardManager().clearKeyboardListener(Phaser.Input.Keyboard.KeyCodes.SPACE);
      // const talkTopics = GameGlobalAPI.getInstance().getGameItemsInLocation(
      //   GameItemType.talkTopics,
      //   GameGlobalAPI.getInstance().getCurrLocId()
      // );
      // talkTopics.forEach(dialogueId => {
      //   console.log("clearing exixting listener: " + this.KeycodesMap[talkTopics.indexOf(dialogueId)]);
      //   this.getKeyBoardManager().clearKeyboardListener(
      //     this.KeycodesMap[talkTopics.indexOf(dialogueId)]
      //   );
      // });
      resolve();}
  }

  private getDialogueGenerator = () => this.dialogueGenerator as DialogueGenerator;
  private getDialogueRenderer = () => this.dialogueRenderer as DialogueRenderer;
  private getSpeakerRenderer = () => this.speakerRenderer as DialogueSpeakerRenderer;
  //CYX add for get keyboard manager
  private getKeyBoardManager = () => this.KeyBoardManager as GameInputManager;
  public getUsername = () => SourceAcademyGame.getInstance().getAccountInfo().name;
}
