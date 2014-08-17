package edu.mit.nlp.segmenter.hierarchical;

import java.util.List;
import java.util.ArrayList;
import java.io.*;
import edu.mit.nlp.segmenter.TextWrapper;

/**
   HSegmentation
   
   Represents a hierarchical segmentation as a series of segmentation points, and
   attached subsegmentations.
**/
public class HSegmentation {
    public HSegmentation(){
        segpts = new ArrayList<Integer>(); //segment-final points
        subsegs = new ArrayList<HSegmentation>();
    }
    public String toString(){
        StringBuffer out = new StringBuffer();
        out.append("[");
        for (int i = 0; i < segpts.size(); i++){
            out.append((subsegs.get(i)==null?segpts.get(i):subsegs.get(i))+" ");
        }
        out.append("]");
        return new String(out);
    }
    public void addSegment(int segpt){
        segpts.add(segpt);
        subsegs.add(null);
    }
    public void addSegment(int segpt, HSegmentation subseg){
        segpts.add(segpt);
        subsegs.add(subseg);
    }

    /* adds it to the next guy that needs it */
    /* should maybe throw an exception if nobody needs it */
    public void addSubsegmentation(HSegmentation p_subseg){
        for (int i = 0; i < subsegs.size(); i++){
            if (subsegs.get(i)==null){
                subsegs.set(i,p_subseg);
                break;
            }
        }
    }

    public boolean equals(final HSegmentation seg){
        if (getDepth() != seg.getDepth()) return false;
        for (int i = 0;i < getDepth() ; i++){
            List my_level = getLevel(i);
            List your_level = seg.getLevel(i);
            if (my_level.size() != your_level.size()) return false;
            for (int j = 0; j < my_level.size(); j++){
                if (! my_level.get(j).equals(your_level.get(j))) return false;
            }
        }
        return true;
    }

    public int getDepth(){ 
        int out = 1;
        for (HSegmentation subseg : subsegs){
            if (subseg !=null){
                int depth_i = 1+subseg.getDepth();
                if (depth_i > out) out = depth_i;
            }
        }
        return out;
    }
   
    /**
       returns the segmentation at a single level of the hierarchy
     **/
    public List getLevel(int level) throws IllegalArgumentException {
        List output;
        if (level == 0) output = segpts;
        else {
            output = new ArrayList<Integer>();
            for (HSegmentation subseg : subsegs){
                if (subseg == null) 
                    throw new IllegalArgumentException("no segmentation at level"+level);
                output.addAll(subseg.getLevel(level-1));
            }
        }
        return output;
    }

    public int getSegNum(int level, int t){
        List seg_level = getLevel(level);
        int ctr = 0;
        for (Object seg_pt : seg_level){
            if (t < ((Integer)seg_pt).intValue()) return ctr;
            ctr++;
        }
        return -1;
    }

    public void clear(){ segpts.clear(); subsegs.clear(); }
    List<Integer> segpts; //endpoints?
    List<HSegmentation> subsegs; 

    //TODO: evaluatioxn

    //this is for testing.  only handles two-level stuff now.
    public static void main(String argv[]) throws Exception {
        //read the test file (argv[0])
        BufferedReader reader = new BufferedReader(new FileReader(argv[0]));
        int segctr = 0; int subsegctr = 0; int linectr = 0; String line;
        HSegmentation root = new HSegmentation();
        HSegmentation current = new HSegmentation();
        while ((line=reader.readLine())!=null){
            if (line.startsWith("====")){
                //do one thing
                subsegctr = 0;
                if (segctr++ > 0){
                    current.addSegment(linectr);
                    root.addSegment(linectr,current);
                    current = new HSegmentation();
                }
            }
            else if (line.startsWith("----")){
                current.addSegment(linectr);
            }
            else  linectr++;
        }
        HTextWrapper text = new HTextWrapper(argv[0]);
        text.useChoiBreaks();
        text.storeRawText();
        text.parse(false);//using stems
        System.out.println("REFSEG: "+text.getReferenceSeg());
        HTextWrapper subtext = text.getSubtext(0,5);
        for (int i = 0; i < subtext.getSentenceCount(); i++){
            System.out.println(i+" "+subtext.getWindowString(i));
        }

        System.out.println(root);
        System.out.println(root.getLevel(0));
        System.out.println(root.getLevel(1));
        //        System.out.println(root.getLevel(2));
        
    }
}
