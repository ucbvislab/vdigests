package edu.mit.nlp.segmenter.hierarchical;

import java.util.ArrayList;
import edu.mit.nlp.ling.Text;
import java.util.List;
import java.util.ArrayList;
import java.util.regex.*;
import java.io.*;
import edu.mit.nlp.MyTextWrapper;

public class HTextWrapper extends MyTextWrapper {
    public HTextWrapper(String fname){
        super(fname);

        try {
        //plus get the reference segmentations
        //we crawl through the file and figure that isht out
        ref_segs = new ArrayList<List>();
        BufferedReader reader = new BufferedReader(new FileReader(fname));
        //this keeps track of the number of seg counters at each level
        List<Integer> seg_ctrs = new ArrayList<Integer>();
        int linectr = 0; String line;
        while ((line=reader.readLine())!=null){
            //apply a regular expression
            Pattern pattern = Pattern.compile("\\=+ (\\d)");
            Matcher matcher = pattern.matcher(line);
            if (matcher.matches()){
                //parse the line using regular expressions
                int depth = new Integer(matcher.group(1)).intValue() - 1; //from the regexp
                //the seg ctrs for all lower levels to zero
                for (int i = depth+1; i < ref_segs.size(); i++){
                    seg_ctrs.set(i,0);
                }
                //if we don't know about this level of segmentation yet, add it
                if (ref_segs.size() <= depth){
                    ref_segs.add(new ArrayList<Integer>());
                    seg_ctrs.add(0);
                }
                
                //check if the seg ctr at this level is greater than zero
                int cur_seg_ctr = seg_ctrs.get(depth);
                if (cur_seg_ctr > 0){
                    //now add a segment at all levels deeper than this
                    for (int i = depth; i < ref_segs.size(); i++){
                        int last_idx = ref_segs.get(i).size()-1;
                        if (last_idx < 0 ||((Integer)ref_segs.get(i).get(last_idx)).intValue() != linectr)
                            ref_segs.get(i).add(linectr);
                    }
                }
                //increment the seg ctr
                seg_ctrs.set(depth,cur_seg_ctr+1);
            } else linectr++;
        }
        } catch (Exception e){
            System.err.println("could not parse ground truth segmentation");
            e.printStackTrace();
        }
    }

    public HTextWrapper(MyTextWrapper little_dude){
        super(little_dude);
    }
    
    public HTextWrapper(HTextWrapper dude){
        super(dude);
    }

    public HTextWrapper(){
        super();
        ref_segs = new ArrayList<List>();
    }

    public int getDepth(){
        return ref_segs.size();
    }

    public List getRefSeg(int depth){
        return ref_segs.get(depth);
    }
    
    public void setRefSeg(List<List> p_ref_segs){ ref_segs = p_ref_segs; }
    
    /**
       Returns another HTextWrapper with only the text between start (inclusive) and end (exclusive)
       Doesn't handle the reference segs appropriately.
     **/
    public HTextWrapper getSubtext(int start, int end){
        HTextWrapper output = new HTextWrapper(this);
        ArrayList rawText2 = new ArrayList(end-start);
        Text text2 = new Text();
        output.sentenceCount_ = end-start;
        //probably should also update wordTokenCount or whatever
        for (int i = start; i < end; i++){
            rawText2.add(rawText_.get(i));
            text2.add(text_.get(i));
        }
        output.rawText_ = rawText2;
        output.text_ = text2;
        return output;
    }
    List<List> ref_segs;


    public static void main(String argv[]){
        HTextWrapper text = new HTextWrapper(argv[0]);
        for (int i = 0; i < text.getDepth(); i++){
            System.out.println(text.getRefSeg(i));
        }
    }
}
