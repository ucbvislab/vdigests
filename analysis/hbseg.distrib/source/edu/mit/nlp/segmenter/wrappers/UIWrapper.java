package edu.mit.nlp.segmenter.wrappers;

import java.util.List;
import java.util.ArrayList;
import java.util.Properties;
import edu.mit.nlp.segmenter.*;
import edu.mit.nlp.segmenter.duration.NormalDurationModel;
import edu.mit.nlp.MyTextWrapper;
import edu.mit.nlp.segmenter.MinCutSeg;
import java.io.*;

/** wraps the Utiyama & Isahara segmenter **/
public class UIWrapper extends SegDurParametrizable {
    public UIWrapper(){ 
    }
    //currently, there are no parameters
    public void initialize(String config_filename){
        super.initialize(config_filename);
        Properties props = new Properties();
        try {
            props.load(new FileInputStream(config_filename));
            num_segs_known = SegTesterParams.getBoolProp(props,"num-segs-known",true);
            is_windowing_enabled = SegTesterParams.getBoolProp(props,"use-fixed-blocks",false);
	    ui_path = props.getProperty("ui-path","baselines/textseg-1.211/");
        } catch (Exception e){
            e.printStackTrace();
        }
    }

    public List[] segmentTexts(MyTextWrapper[] texts, int[] num_segs){
        Runtime runtime = Runtime.getRuntime();
        List[] hyps = new List[texts.length];
        for (int i = 0; i < texts.length; i++){
            try {
                String segline = ui_path+"MySeg ";
		if (num_segs_known) segline = segline+ "-n "+num_segs[i];
                else {
                    //arbitrarily multiply by 6 bc Seg expects number of words rather
                    //than number of sentences.  compute this a little more intelligently later.
                    //especially: should be different in ICSI vs Clinical

                    //should be:
                    //segline = prep-seg < filename | nseg -ndist blablabla
                    if (dm(i) instanceof NormalDurationModel)
                        segline = segline + 
                            String.format("-nseg 1.0 0.0 1.0 %.1f %.2f",
                                          6*dm(i).edur(), 
                                          6*((NormalDurationModel)dm(i)).stdev());
                    else {
                        String msg = "NormalDurationModel is only supported duration model at this time";
                        out.println(msg);
                        System.err.println(msg);
                        System.exit(0);
                    }
                }
		if (debug) out.println(segline);
                //TODO: add something using mean and variance
                Process proc = runtime.exec(segline); //it doesn't seem to be getting the arguments
                PrintStream p_out = new PrintStream(proc.getOutputStream());
                for (int j = 0; j < texts[i].getWindowCount(); j++){
                    p_out.println(texts[i].getWindowString(j));
                }
                p_out.close();
                BufferedReader bufferedreader =
                    new BufferedReader(new InputStreamReader(proc.getInputStream()));
                int segctr = 0; int linectr = 0; String line;
                hyps[i] = new ArrayList();
                while ((line = bufferedreader.readLine())!=null){
                    if (line.startsWith("====")){
                        if (segctr++ > 0) {//don't add the first one
                            hyps[i].add(linectr);
                        }
                    } else{
                        linectr++;
                        //                        if (debug) System.out.print((linectr)+": ");
                    }
                    //                    if (debug) System.out.println(line);
                }
                hyps[i].add(linectr);
                if (debug) System.out.println("hyp pre: "+hyps[i]);
                if (is_windowing_enabled) hyps[i] = MinCutSeg.convertWindow2SentenceSegmentation(hyps[i], texts[i]);
                if (debug) System.out.println("hyp post: "+hyps[i]);
                if (debug) System.out.println("ref: "+texts[i].getReferenceSeg());
            } catch (Exception e){
                e.printStackTrace();
            }
        }        
        return hyps;
    }

    
    boolean is_windowing_enabled = false;
    boolean num_segs_known=true;
    String ui_path;
}
                
