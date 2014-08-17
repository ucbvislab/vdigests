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

/**
   Hierarchical segmentation from Bayesian lexical cohesion
**/

public class HBayesSegN extends HSegmenter {
    public HBayesSegN(){
        alphas = null;
        gamma = new FastDoubleGamma();
        start_time = new Date().getTime();
    }
    public void setPrintStream(PrintStream p_out){
        super.setPrintStream(p_out);
    }
    public void initialize (String config_filename){
        Properties props = new Properties();
        //        super.initialize(config_filename);
        try {
            props.load(new FileInputStream(config_filename));
            init_alpha = (float) SegTesterParams.getDoubleProp(props,"dirichlet-prior",.005);
            K_MAX = SegTesterParams.getIntProp(props,"max-segs",K_MAX);
            same_alphas = SegTesterParams.getBoolProp(props,"same-alphas",true);
        } catch (Exception e){ e.printStackTrace(); }
    }

    public void setTexts(HTextWrapper[] texts, int depth){
        D = texts.length; L = depth;
        dpdocs = new DPDocument[D][L];
        alphas = new float[L];
        for (int l = 0; l < alphas.length; l++) alphas[l] = init_alpha;
        
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

//     public void setR(double[][] p_r){
//         for (int i =0 ;i < D; i++) 
//             for (int l = 0; l < L; l++){
//                 r[i][l] = (float) p_r[i][l];
//             }
//     }
    
    //durs = DxL, fine-to-course
    public void setDurationModel(List<Integer>[][] durs){
        r = new float[durs.length][durs[0].length];
        for (int i = 0; i < durs.length; i++){
            for (int l = 0; l < durs[i].length; l++){
                int dur_sum = 0;
                for (int dur : durs[i][l]) dur_sum += dur;
                r[i][l] = (float) durs[i][l].size() / dur_sum;
                if (debug)
                    out.println
                        (String.format(" HSBN.setDur sum[%d][%d]=%d, r=%.2f",
                                       i,l,dur_sum,r[i][l]));

            }
        }
    }
        

    /**
       see the paper...
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

    protected float[][] computeSegProbs(DPDocument doc){
        int T = (int) doc.T();
        out.println("COMPUTING SEG PROBS WITH ALPHA="+doc.getPrior());
        float[][] B = new float[T+1][T+1];
        for (int u = 0; u < T+1; u++){
            for (int v= u+1; v < T+1; v++){
                B[u][v] = (float) doc.segLL(u+1,v);
            }
        }
        return B;
    }

    protected HSegmentation segmentText(int i, float[][][] B){
        int T = (int) dpdocs[i][0].T();
        float[][][] A = new float[L][T+1][T+1];
        int[][][] aBest = new int[L][T+1][T+1];
        for (int l = 0; l < L; l++){
            float log_r =  (float) Math.log(r[i][l]); 
            float log_1subr = (float) Math.log(1-r[i][l]);
            if (debug) out.println(" HBSN.segmentText: r["+i+","+l+"]"+r[i][l]);
            assert (r[i][l] < 1);
            for (int u = 0; u < T+1; u++){
                for (int v = u+1; v < T+1; v++){
                    B[l][u][v] += (v-u-1) * log_1subr + log_r; 
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

//     protected HSegmentation segmentText(int i){
//         float[][][] B = new float[L][][];
//         for (int l = 0; l < L; l++){
//             if (l == 0 || !same_alphas){
//                 dpdocs[i][l].setPrior(alphas[l]);
//                 B[l] = computeSegProbs(dpdocs[i][l]);
//             } else {
//                 for (int t = 0; t < B[0].length; t++){
//                     B[l][t] = Arrays.copyOf(B[0][t],B[0][t].length);
//                 }
//             }
//         }
//         return this.segmentText(i,B);
//     }

    protected HSegmentation segmentText(int i){
        //this is the table of segment probabilities
        float B[][][] = new float[L][][];
        for (int l = 0; l < L; l++){
            B[l] = computeSegProbs(dpdocs[i][l]);
        }
        //return super.segmentText(i,B); //hopefully these params get overwritten
        float[][] p_ns = new float[2][50];
        Arrays.fill(p_ns[0],(float)Math.log(0));
        Arrays.fill(p_ns[1],(float)Math.log(0));
        
        p_ns[0][6] = 0f;
        p_ns[1][4] = 0f;
        return segmentText(i,B);
        
        //return segmentTextTwoLayer(B,p_ns);
    }

    
    //segments text in two layers, given distributions
    //over the total number of segments at each layer
    protected HSegmentation segmentTextTwoLayer(float[][][] B, float[][] p_ns){
        int T = (int) B[0].length-1;
        assert (L == 2);
        int[] K_MAX = new int[2]; //max num segments
        for (int l = 0; l < L; l++){
            double cum_score = 0;
            for (int i = 1; i < p_ns[l].length; i++){
                cum_score += Math.exp(p_ns[l][i]);
                if (cum_score >= .95){
                    K_MAX[l] = i; break;
                }
            }
            if (debug) out.println("KMAX["+l+"]="+K_MAX[l]);
        } 
        float[][][] A0 = new float[K_MAX[0]][T+1][T+1]; //scores at level 0
        int[][][] a0BestT = new int[K_MAX[0]][T+1][T+1]; //best t at level 0

        float[][][][] A1 = new float[K_MAX[1]][K_MAX[0]][T+1][T+1]; //scores at level 1
        int[][][][] a1BestT = new int[K_MAX[1]][K_MAX[0]][T+1][T+1]; //scores at level 1
        int[][][][] a1BestK = new int[K_MAX[1]][K_MAX[0]][T+1][T+1]; //scores at level 1

        //first-level segmentation
        for (int u = 0; u < T+1; u++){
            for (int v = u+1; v < T+1; v++){
                for (int k = 0; k < K_MAX[0] & k < v-u; k++){
                    if (k == 0){
                        A0[0][u][v] = B[0][u][v];
                    } else {
                        float best_t_score = -Float.MAX_VALUE;
                        int best_t = -1;
                        for (int t = u; t< v; t++){
                            float score = B[0][t][v] + //obs
                                A0[k-1][u][t]; //left-side
                            if (score > best_t_score){
                                best_t_score = score; best_t = t;
                            }
                        }
                        A0[k][u][v] = best_t_score;
                        a0BestT[k][u][v] = best_t;
                    }
                }
                for (int k = v-u; k < K_MAX[0]; k++){
                    A0[k][u][v] = -Float.MAX_VALUE;
                    a0BestT[k][u][v] = -1;
                }
            }        
        }
//         for (int k = 0; k < K_MAX[0]; k++){
//             System.out.println(JacobUtil.formatMatrix("%.1e"," ",A0[k]));
//             System.out.println(JacobUtil.formatMatrix("%d"," ",a0BestT[k]));
//         }

        //second-level segmentation
        for (int u = 0; u < T+1; u++){
            for (int v = u+1; v< T+1; v++){
                for (int k0 = 0; k0 < K_MAX[0] && k0 < v-u; k0++){
                    A1[0][k0][u][v] = A0[k0][u][v] + B[1][u][v];
                }
                for (int k1 = 1; k1 < K_MAX[1] && k1 < v-u; k1++){ //outer counter
                    for (int k0 = k1; k0 < K_MAX[0] && k0 < v-u; k0++){ //inner counter
//                         System.out.println
//                             (String.format("%d %d %d %d",u,v,k0,k1));
                        float best_t_score = -Float.MAX_VALUE;
                        int best_t = -1;
                        int best_k = -1;
                        for (int t = u; t < v; t++){
                            float best_k_score = -Float.MAX_VALUE;
                            int best_local_k =-1;
                            for (int ksub = 0; 
                                 ksub < k0 && //can't put more than k0 segments on the right
                                     ksub < v-t && 
                                     k0-ksub <= t-u ; ksub++){
                                // System.out.println
//                                     (String.format("%d %d %f %f",t,ksub,A0[ksub][t][v],A1[k1-1][k0-ksub][u][t]));
                                float score = A0[ksub][t][v] + A1[k1-1][k0-ksub][u][t];
                                if (debug) out.println
                                    (String.format("%d k0=%d k1=%d ksub=%d %.1e",t,k0,k1,ksub,score));
                                if (score > best_k_score){
                                    best_k_score = score;
                                    best_local_k = ksub;
                                }
                            }
                            float t_score = best_k_score + B[1][t][v];
//                             System.out.println("t("+t+")="+t_score);
                            if (t_score > best_t_score){
                                best_t_score = t_score;
                                best_t = t;
                                best_k = best_local_k;
                            }
                        }
                        A1[k1][k0][u][v] = best_t_score;
                        a1BestT[k1][k0][u][v] = best_t;
                        a1BestK[k1][k0][u][v] = best_k;
                    }
                }
                for (int k1 = v-u; k1 < K_MAX[1]; k1++){
                    for (int k0 = 0; k0 < K_MAX[0]; k0++){
                        A1[k1][k0][u][v] = -Float.MAX_VALUE;
                    }
                }
            }
        }

        if (debug){
            for (int k1 = 0; k1 < K_MAX[1]; k1++){
                for (int k0 = k1; k0 < K_MAX[0]; k0++){
                    out.println("num segs: "+k1+" "+k0);
                    out.println(JacobUtil.formatMatrix("%.1e"," ",A1[k1][k0]));
                    out.println(JacobUtil.formatMatrix("%d"," ",a1BestK[k1][k0]));
                }
            }
        }
        
        //now recover the segmentation
        int K1 =-1; int K0=-1;
        float best_score = -Float.MAX_VALUE;
        for (int i = 0; i < K_MAX[1]; i++){
            float ns_score = p_ns[1][i+1];
            for (int j = 0; j < K_MAX[0]; j++){
                float score = A1[i][j][0][T] + ns_score + p_ns[0][j+1];
                if (score > best_score) {
                    K1 = i; K0 = j;
                }
                out.print(String.format("%.1e ",score));
            }
            out.println();
        }
        out.println("K1:" +K1+" K0: "+K0);
        
        out.println(JacobUtil.formatMatrix("%d"," ",a1BestT[K1][K0]));
        out.println(JacobUtil.formatMatrix("%d"," ",a0BestT[K0]));
        out.println(JacobUtil.formatMatrix("%d"," ",a1BestK[K1][K0]));

        HSegmentation seg = new HSegmentation();
        List<Integer> segpts= new ArrayList<Integer>();
        List<HSegmentation> subsegs = new ArrayList<HSegmentation>();
        int seg_end_pt = T;
        int k1 = K1; int k0 = K0;
        while (seg_end_pt > 0){
            segpts.add(seg_end_pt);
            //where the next segment will start
            out.println(k1+" "+k0+" "+a1BestT.length);
            int next_seg_pt =  a1BestT[k1][k0][0][seg_end_pt]; 

            List<Integer> subsegpts = new ArrayList<Integer>();
            int subseg_end_pt = seg_end_pt;
            int kprime = a1BestK[k1][k0][0][next_seg_pt];
            while (subseg_end_pt > next_seg_pt){
                subsegpts.add(subseg_end_pt);
                subseg_end_pt = a0BestT[kprime--][next_seg_pt][subseg_end_pt];
            }
            Collections.reverse(subsegpts);
            HSegmentation subseg = new HSegmentation();
            for (int subsegpt : subsegpts)
                subseg.addSegment(subsegpt);
            subsegs.add(subseg);
            seg_end_pt = next_seg_pt; k1--; k0 -= kprime;
        }
        Collections.reverse(segpts);
        Collections.reverse(subsegs);
        for (int i = 0; i < subsegs.size(); i++){
            seg.addSegment(segpts.get(i),subsegs.get(i));
        }
        return seg;        
    }


    protected HSegmentation recoverSegmentation(int[][][][] p_abest, 
                                                int[][][] p_cbest, 
                                                int start_pt, 
                                                int end_pt, int l, int k){
        //go through the topmost level of abest at k=cbest[i][
//         if (debug) System.out.println
//             (String.format("recovering %d %d %d %d",
//                            start_pt,end_pt,l,k));
        HSegmentation seg = new HSegmentation();
        List<Integer> segpts = new ArrayList<Integer>();
        int next_seg_pt = end_pt;
        while (next_seg_pt > start_pt){
            segpts.add(next_seg_pt);
            //if (debug) System.out.println("adding: "+next_seg_pt);
            next_seg_pt = p_abest[l][k--][start_pt][next_seg_pt];
        }
        Collections.reverse(segpts);
        int cur_start_pt  = start_pt;
        for (int seg_pt : segpts){
            HSegmentation subseg = null;
            if (l > 0){
              //   if (debug) System.out.println
//                     (String.format("%d %d",cur_start_pt,p_cbest.length));
                subseg = recoverSegmentation
                    (p_abest,p_cbest,cur_start_pt,seg_pt,
                     l-1,p_cbest[l-1][cur_start_pt][seg_pt]);
            }
            seg.addSegment(seg_pt,subseg);
            cur_start_pt = seg_pt;
        }
        return seg;
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
    float r[][]; //D x L -- segmentation rate
    DPDocument[][] dpdocs;
    int L; //number of segmentation levels
    int D; //number of documents
    static int K_MAX = 10; //max number of subsegments at any level
    static int K_MIN = 2;
    static boolean print_time_stamps = true;
    FastDoubleGamma gamma;
    long start_time;
}
