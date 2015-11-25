// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'; 

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Here is the actual word wrap implementation... VSCode wire up is after this
    //
    function wrapTextBasic(
        doc : vscode.TextDocument, 
        rangeToWrap : vscode.Range, 
        wrapColumn : number,
        wordBreaker : (text : string) => string[],
        wordJoiner : (words : string[]) => string,
        lineJoiner : (a : string, b : string) => string,
        resultFormatter : (lines: string[])=>string) : string {
            
        // Just to be clear, this is HORRIBLY HORRIBLY inefficient!! Check out
        // the inner most loop... we break and re-join words together generating
        // TONS of temporary strings and arrays just to measure the string length
        // again, and again... 
        //            
            
        let res : string[] = [];
        let leftOver : string;
        
        function pushLeftOver() {
            if (leftOver) {
                res.push(leftOver);
                leftOver = null;
            }
        }
        
        for (let lineNo = rangeToWrap.start.line; lineNo <= rangeToWrap.end.line; lineNo++) {
            let line = doc.lineAt(lineNo);
            let lineText = line.text;
            
            if (!lineText) {
                pushLeftOver();
                res.push(""); // empty line
            }
            
            leftOver = lineJoiner(leftOver, lineText.trim());
            
            while (leftOver.length > wrapColumn) {
                let broken = wordBreaker(leftOver);

                let fit = true;
                let consumedWords :string[] = []                
                let remainWords  :string[] = []; 
                
                consumedWords.push(broken[0]); // at least 1 word!
                
                for (let i=1; i<broken.length; i++) {
                    if (fit) {
                        let candidate = wordJoiner(consumedWords.concat([broken[i]]));
                        if (candidate.length > wrapColumn) {
                            fit = false;
                        }
                    }
                    if (fit) {
                        consumedWords.push(broken[i]);
                    }
                    else {
                        remainWords.push(broken[i]);
                    }
                }
                
                res.push(wordJoiner(consumedWords));
                leftOver = wordJoiner(remainWords);;
            }
        }
        
        pushLeftOver();

        return resultFormatter(res);        
    }


    // This is the command wire up mechanism with VSCode
    //
	var disposable = vscode.commands.registerCommand('extension.wordWrap', () => {

		let editor = vscode.window.activeTextEditor;
        let doc = editor.document;

        // default to document scope
        let start = new vscode.Position(0,0);
        let end = new vscode.Position(doc.lineCount - 1, 0);

        if (editor.selection && !editor.selection.isEmpty)
        {
            start = editor.selection.start;
            end = editor.selection.end;
        }
        
        // ensure that end is on the last char of the line, start is on the first 
        //
        start = new vscode.Position(start.line, 0);
        end = new vscode.Position(end.line, doc.lineAt(end.line).text.length);
        
        let activeRange = new vscode.Range(start, end); 
        
        editor.edit(e=> {
            let newText = wrapTextBasic(
                doc, 
                activeRange, 
                100,
                text=>text.split(" "),
                words=>words.join(" "),
                (a,b) => {
                    let spacer = a ? " " : "";
                    return (a || "") + spacer + b;
                },   
                lines=>lines.join("\r\n"))
            e.replace(activeRange, newText);
        })
	});
	
	context.subscriptions.push(disposable);
}