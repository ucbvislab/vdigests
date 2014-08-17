package edu.mit.nlp.segmenter.hierarchical;

import edu.mit.nlp.segmenter.SegTesterParams;
import edu.mit.nlp.segmenter.dp.DPDocument;
import edu.mit.nlp.segmenter.dp.I2JInterface;
import edu.mit.util.stats.*;
import edu.mit.util.JacobUtil;
import java.io.FileInputStream;
import java.io.PrintStream;
import java.util.*;
import cern.jet.random.Binomial;
import cern.jet.random.Gamma;
/**
   Hierarchical segmentation from Bayesian lexical cohesion.

   This is the base class, but it doesn't implement LSVB 
   (latent variable estimation for the segment-levels)
   or EM to select alpha (those are implemented in subclasses)

**/

public class HBayesSeg extends HSegmenter {
    public HBayesSeg(){
        alphas = null;
        gamma = new FastDoubleGamma();
        start_time = new Date().getTime();
    }
    public void setPrintStream(PrintStream p_out){
        super.setPrintStream(p_out);
    }
    public void initialize (String config_filename){
        Properties props = new Properties();
        super.initialize(config_filename);
        try {
            props.load(new FileInputStream(config_filename));
            init_alpha = (float) SegTesterParams.getDoubleProp
                (props,"dirichlet-prior",Gamma.staticNextDouble(1,1));
            K_MAX = SegTesterParams.getIntProp(props,"max-segs",K_MAX);
            same_alphas = SegTesterParams.getBoolProp(props,"same-alphas",true);
        } catch (Exception e){ e.printStackTrace(); }
    }

    public void setTexts(HTextWrapper[] texts, int depth){
        D = texts.length; L = depth;
        dpdocs = new DPDocument[D][L];
        alphas = new float[L];
        for (int l = 0; l < alphas.length; l++) {
            alphas[l] = init_alpha;
        }
        
//         r = new float[D][L];
        for (int i = 0; i < D; i++){
            //T[i] = texts[i].getSentenceCount();
            for (int l = 0; l < L; l++){
                if (l == 0 || !same_alphas){
                    //these dudes store the counts in an efficient way
                    dpdocs[i][l] = I2JInterface.makeDPDoc(texts[i]);
                    //is it stupid to share the same cache across the dcm & binomials?
                    //i forget how these things work
                    dpdocs[i][l].setGamma(gamma);
                    dpdocs[i][l].setPrior(alphas[l]);
//                     r[i][l] = (float)texts[i].getRefSeg(L-l-1).size() / 
//                         texts[i].getSentenceCount();
                } else { //we are just copying 
                    dpdocs[i][l] = dpdocs[i][0];
                }
            }
        }
    }


    /**
       This is what gets called on the outside.
     **/
    public HSegmentation[] segmentTexts(){
        HSegmentation[] segs = new HSegmentation[D]; //one per document
        FastBinomial bin = new FastBinomial (10,.1);
        bin.setGamma(gamma);

        for (int i = 0; i < D; i++){
            if (debug) out.println("SEGMENT TEXTS: "+i);
            segs[i] = segmentText(i);
        }
        return segs;
    }

    /**
       This is the unscaled way of computing the B matrix
     */
    protected static float[][] computeSegProbs(DPDocument doc){
        int T = (int) doc.T();
        //out.println("COMPUTING SEG PROBS WITH ALPHA="+doc.getPrior());
        float[][] B = new float[T+1][T+1];
        for (int u = 0; u < T+1; u++){
            for (int v= u+1; v < T+1; v++){
                B[u][v] = (float) doc.segLL(u+1,v);
            }
        }
        return B;
    }

    /**
       @param B is the table of one-level segmentation costs, size L x (T+1) x (T+1)
       @param i indicates which document is being segmented
     **/
    protected HSegmentation segmentText(int i, float[][][] B){
        int T = (int) dpdocs[i][0].T();
        float[][][] A = new float[L][T+1][T+1];
        int[][][] aBest = new int[L][T+1][T+1];
        for (int l = 0; l < L; l++){
//             float log_r =  (float) Math.log(r[i][l]); 
//             float log_1subr = (float) Math.log(1-r[i][l]);
//             if (debug) out.println(" HBSN.segmentText: r["+i+","+l+"]"+r[i][l]);
//             assert (r[i][l] < 1);
            if (debug){
                out.println(" segmenting with dm: "+dm[i][l].toString());
            }
            for (int u = 0; u < T+1; u++){
                for (int v = u+1; v < T+1; v++){
                    //                    B[l][u][v] += (v-u-1) * log_1subr + log_r; 
                    B[l][u][v] += dm[i][l].logPDur(v-u);
                }
            }
            float[][] b_l = B[l];
            printTimeStamp("building A"+l);
            for (int u = 0; u < T+1; u++){
                float[] a_l_u = A[l][u];
                float[][] a_lsub1 = null;
                if (l > 0) a_lsub1 = A[l-1];
                for (int v = u+1; v < T+1; v++){
                    float best_t_score = -Float.MAX_VALUE;
                    int best_t = -1;
                    for (int t = u; t < v; t++){
                        float score = b_l[t][v] + //observation
                            a_l_u[t]; //left-side
                        if (l > 0) score += a_lsub1[t][v]; //decomposition
                        if (score > best_t_score){
                            best_t_score = score;
                            best_t = t;
                        }
                    }
                    assert (best_t > -1);
                    // if (best_t == -1){
//                         for (int l2 = 0; l2 < L ;l2++){
//                             System.out.println
//                                 (JacobUtil.formatMatrix("%.1e"," ",B[l2]));
//                         }
//                         out.println(B);
//                         System.exit(0);
//                     }
                    A[l][u][v] = best_t_score;
                    aBest[l][u][v] = best_t;
                }
            }
        }
        printTimeStamp("recovering segmentation");
        out.println("LL: "+A[L-1][0][T]);
        return recoverSegmentation(aBest,0,T,L-1);  //this is totally wrong
    }

    protected HSegmentation segmentText(int i){
        //this is the table of segment probabilities
        float B[][][] = new float[L][][];
        for (int l = 0; l < L; l++){
            B[l] = computeSegProbs(dpdocs[i][l]);
        }
        return segmentText(i,B);        
    }

    protected HSegmentation recoverSegmentation(int aBest[][][], int start_pt, int end_pt, int l){
        HSegmentation seg = new HSegmentation();
        List<Integer> segpts = new ArrayList<Integer>();
        int next_seg_pt = end_pt;
        while (next_seg_pt > start_pt){
            segpts.add(next_seg_pt);
            //if (debug) System.out.println("adding: "+next_seg_pt);
            next_seg_pt = aBest[l][start_pt][next_seg_pt];
        }
        Collections.reverse(segpts);
        int cur_start_pt = start_pt;
        for (int seg_pt : segpts){
            HSegmentation subseg = null;
            if (l > 0)
                subseg = recoverSegmentation(aBest,cur_start_pt,seg_pt,l-1);
            seg.addSegment(seg_pt,subseg);
            cur_start_pt = seg_pt;
        }
        return seg;
    }

    protected void printTimeStamp(String message){
        if (print_time_stamps) 
            out.println(message+": "+(new Date().getTime()-start_time));
    }


    float init_alpha;
    float[] alphas;
    boolean same_alphas;
    //    float r[][]; //D x L -- segmentation rate

    DPDocument[][] dpdocs;
    int L; //number of segmentation levels
    int D; //number of documents
    static int K_MAX = 10; //max number of subsegments at any level
    static int K_MIN = 2;
    static boolean print_time_stamps = true;

    FastDoubleGamma gamma;
    long start_time;
}
