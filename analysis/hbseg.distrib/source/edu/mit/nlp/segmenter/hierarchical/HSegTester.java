package edu.mit.nlp.segmenter.hierarchical;

import ml.options.Options;
import ml.options.OptionSet;
import edu.mit.nlp.segmenter.SegmentationScore;
import edu.mit.nlp.segmenter.SegTester;
import edu.mit.nlp.segmenter.SegTesterParams;
import edu.mit.util.JacobUtil;
import java.util.List;
import java.util.ArrayList;
import java.io.*;

/**
   The purpose of this class is to provide to a unified framework to evaluate
   and run hierarchical segmentation
**/

public class HSegTester extends SegTester {
    public static void main(String[] args){
        Options options = new Options(args);
        options.addSet("run",0);
        options.getSet("run").addOption("debug",Options.Multiplicity.ZERO_OR_ONE);
        options.getSet("run").addOption("out",Options.Separator.BLANK,Options.Multiplicity.ZERO_OR_ONE);        
        options.getSet("run").addOption("num-segs",Options.Separator.BLANK,Options.Multiplicity.ZERO_OR_ONE);
        options.getSet("run").addOption("config",Options.Separator.BLANK,Options.Multiplicity.ZERO_OR_ONE);
        options.getSet("run").addOption("depth",Options.Separator.BLANK,Options.Multiplicity.ONCE);
        options.getSet("run").addOption("expected-durs",Options.Separator.BLANK,Options.Multiplicity.ZERO_OR_ONE);
        options.addSet("eval",0);
        options.getSet("eval").addOption("debug",Options.Multiplicity.ZERO_OR_ONE);
        options.getSet("eval").addOption("config",Options.Separator.BLANK,Options.Multiplicity.ZERO_OR_ONE);
        options.getSet("eval").addOption("dir",Options.Separator.BLANK,Options.Multiplicity.ONCE);
        options.getSet("eval").addOption("suff",Options.Separator.BLANK,Options.Multiplicity.ONCE);
        options.getSet("eval").addOption("out",Options.Separator.BLANK,Options.Multiplicity.ZERO_OR_ONE);        
        options.getSet("eval").addOption("max-depth",Options.Separator.BLANK,Options.Multiplicity.ZERO_OR_ONE);
        ml.options.OptionSet optset = options.getMatchingSet();
        if (optset == null) throw new IllegalArgumentException(usage_msg);
        try {
            HSegTester segtester = new HSegTester(optset);
            /* use reflection to create a segmenter */
            String segmenter_name = segtester.params.segmenter();
            HSegmenter segmenter = null;
            segmenter = (HSegmenter) Class.forName(segmenter_name).
                getConstructor(new Class[]{}).newInstance(new Object[]{});
            segtester.out = System.out;
            if (optset.isSet("out")){
                segtester.out_file = new File(optset.getOption("out").getResultValue(0));
                segtester.out = new PrintStream(new FileOutputStream(segtester.out_file));
                segmenter.setPrintStream(segtester.out);
            } 
            /* initialize and evaluate */
            boolean debug = optset.isSet("debug");

            segmenter.initialize(optset.getOption("config").getResultValue(0));
            segmenter.setDebug(debug);
            
            /************ run *******************/
            if (optset.getSetName().equals("run")){
                /* get the file from stdin */
                BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
                List<String> lines = new ArrayList<String>();
                while (in.ready()) lines.add(in.readLine());
                if (lines.size() == 0){
                    throw new IllegalArgumentException
                        ("To run a segmenter, please provide some text on stdin.");
                }
                
                //this is not elegant, but we're just gonna write stuff out to a file. 
                //otherwise I'd have to really mess with Igor's TextWrapper or totally 
                //supercede it.
                File tmp = File.createTempFile("segmenter","tmp");
                PrintStream tmp_out = new PrintStream(new FileOutputStream(tmp));
                //maybe do something intelligent to stream out the subseq boundaries
                for (String line : lines){
                    tmp_out.println(line);
                }
                //create new mytextwrapper
                if (debug) segtester.out.println("loading text");
                HTextWrapper text = new HTextWrapper(tmp.getPath());
                SegTester.preprocessText(text, true, false, true, true, 0);
                if (debug) segtester.out.println("segmenting");
                int depth = new Integer(optset.getOption("depth").getResultValue(0)).intValue();
                segmenter.setTexts(new HTextWrapper[]{text},depth);

                List[][] edurs = null;
                if (optset.isSet("expected-durs")){ //i think it's supposed to fine-to-coarse but i'm not sure
                    String[] s_edurs = optset.getOption("expected-durs").
                        getResultValue(0).split(" ");
                    assert (s_edurs.length == depth);
                    edurs = new List[1][depth];
                    for (int l = 0; l < depth; l++){
                        edurs[0][l] = new ArrayList<Integer>();
                        Integer edur = new Integer(s_edurs[l]);
                        edurs[0][l].add(edur);
                        if (l > 0) assert (edur.intValue() >= ((Integer)edurs[0][l-1].get(0)).intValue());
                    }
                } else {
                    edurs = getEDurs(new HTextWrapper[]{text},depth);
                }
                segmenter.setDurationModel(edurs);

                HSegmentation[] hyp_segs = segmenter.segmentTexts();
                //                    (,new double[][]{edurs});
                segtester.out.println(hyp_segs[0]);
                for (int i = 0; i < depth; i++){
                    System.out.println(hyp_segs[0].getLevel(i));
                }
            } else { /****************** eval ***************/
                segtester.out.println(segtester.params.getProps());
                //load the files...
                final String the_suff = optset.getOption("suff").getResultValue(0).trim();
                File the_dir = new File(optset.getOption("dir").getResultValue(0).trim());
                FilenameFilter myfilt = new FilenameFilter(){
                        public boolean accept(File dir, String name){
                            return name.endsWith(the_suff);
                        }
                    };
                String[] filenames = the_dir.list(myfilt);
                if (filenames == null) 
                    throw new IllegalArgumentException("Cannot find any files in "+the_dir.getPath()+"*."+the_suff+"\n"+usage_msg);
                HTextWrapper[] texts = new HTextWrapper[filenames.length];
                                
                for (int i = 0; i < filenames.length; i++){
                    String filename = the_dir+"/"+filenames[i];
                    segtester.out.println(filename);
                    texts[i] = new HTextWrapper(filename);
                    SegTester.preprocessText(texts[i],
                                             segtester.params.useChoiStyleBounds(),
                                             segtester.params.isWindowingEnabled(),
                                             segtester.params.isRemoveStopWords(),
                                             segtester.params.isStemsEnabled(),
                                             segtester.params.getWindowSize());
                
                }
                int L = texts[0].getDepth(); //could keep track of max depth in prev loop, but whatever
                if (optset.isSet("max-depth")){
                    int max_depth = new Integer(optset.getOption("max-depth").getResultValue(0)).intValue();
                    if (L > max_depth) L = max_depth;
                }
                segmenter.setTexts(texts,L);
                segmenter.setDurationModel(getEDurs(texts,L));
                //segment
                HSegmentation[] hyp_segs =segmenter.segmentTexts();

                //evaluate
                //we keep a 
                double[] pks = new double[L];
                double[] wds = new double[L];
                double[] counts = new double[L];

                for (int i = 0; i < hyp_segs.length; i++){
                    for (int j = 0; j < L; j++){
                        segtester.out.println(hyp_segs[i].getLevel(j));
                        pks[j] += SegmentationScore.calcErrorProbablity(hyp_segs[i].getLevel(j),
                                                                   texts[i].getRefSeg(j),
                                                                   texts[i],
                                                                   "Pk");
                        wds[j] += SegmentationScore.calcErrorProbablity(hyp_segs[i].getLevel(j),
                                                                   texts[i].getRefSeg(j),
                                                                   texts[i],
                                                                   "WD");
                        counts[j]++;
                    }
                }
                for (int i = 0; i < L; i++){
                    segtester.out.println
                        (String.format("%d %f %f",i,pks[i]/counts[i],wds[i]/counts[i]));
                }
            }
        } catch (Exception e){
            e.printStackTrace();
            System.err.println(usage_msg);
        }
    }

    protected static List[][] getEDurs(HTextWrapper[] texts, int L){
        List[][] edurs = new List[texts.length][L];
        for (int i = 0; i < texts.length; i++){
            for (int l = 0; l < L; l++){
                List<Integer> segpts = texts[i].getRefSeg(l);
                int prev_end = 0;
                edurs[i][L-l-1] = new ArrayList<Integer>();
                int total_dur = 0;
                //                System.out.println(segpts);
                for (int segpt : segpts){ 
                    if (segpt > 0){
                        edurs[i][L-l-1].add(segpt - prev_end);
                        if (segpt - prev_end == 0){
                            System.out.println(""+segpt+" "+prev_end+": "+segpts);
                            System.exit(0);
                        }
                        total_dur += segpt - prev_end;
                        prev_end = segpt;
                    }
                }
                assert(total_dur == texts[i].getSentenceCount());
            }
        }
        return edurs;
    }

    public HSegTester(OptionSet optset) throws Exception {
        super(optset);
    }

    private static String usage_msg = "Usage: HSegTester -config config -dir dir -suff suff [-out out] -segmenter <bayes|mcs|ui> -options options";
    protected PrintStream out;
    static int top_seg_size = 5+1;
    static int sub_segs = 3;

                
}
