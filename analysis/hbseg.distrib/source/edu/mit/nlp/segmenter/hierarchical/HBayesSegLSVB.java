package edu.mit.nlp.segmenter.hierarchical;

import edu.mit.nlp.segmenter.SegTesterParams;
import edu.mit.nlp.segmenter.dp.DPDocument;
import edu.mit.nlp.segmenter.dp.I2JInterface;
import edu.mit.util.stats.*;
import edu.mit.util.stats.Variational;
import edu.mit.util.JacobUtil;
import java.io.FileInputStream;
import java.util.*;
import cern.jet.random.Uniform;
import cern.jet.random.engine.RandomEngine;
import cern.jet.random.engine.MersenneTwister;

/**
   Hierarchical segmentation from Bayesian lexical cohesion
   maintains a latent variable L that assigns word tokens directly
   to specific segmentation levels.
   updates L using latent state variational bayes (Sung, Ghahramani & Bang, PAMI 2008 (30) 12)
   then updates the segmentation.  and loops.
 **/

public class HBayesSegLSVB extends HBayesSegEM {
    public HBayesSegLSVB(){
        start_time = new Date().getTime();
        engine = null;
        m_digamma = new FastDigamma();
        initializer = new GreedySegmenter();
        top_layer = false;
    }
    public void initialize (String config_filename){
        super.initialize(config_filename);
        initializer.initialize(K_INITIALIZER_FILENAME); //this is not great
        Properties props = new Properties();
        try {
            props.load(new FileInputStream(config_filename));
            beta = (double) SegTesterParams.getDoubleProp(props,"beta-parameter",1);
            out.println("beta: "+beta);
            seed =  SegTesterParams.getIntProp(props,"seed",(int)(new Date()).getTime());
            out.println("INITIALIZING FROM: "+seed);
            engine = new MersenneTwister(seed);
            use_component_weights = SegTesterParams.getBoolProp(props,"use-component-weights",true);
            top_layer = SegTesterParams.getBoolProp(props,"include-document-level",false);
        } catch (Exception e){ e.printStackTrace(); }
    }
    /** this is really exclusively for PriorOptimizer **/
    protected int getNumLevels(){ return L + (top_layer?1:0); }    
    public void setTexts(HTextWrapper[] texts, int depth){
        super.setTexts(texts,depth);
        initializer.setTexts(texts,depth);
        m_Z = new double[texts.length][][][];
        alphas = new float[L+(top_layer?1:0)];
        for (int l = 0; l < alphas.length; l++) alphas[l] = init_alpha;
    }

    public void setDurationModel(List<Integer>[][] durs){
        super.setDurationModel(durs);
        m_durs = durs;
        if (debug) out.println("calling set duration model for initializer with "+durs.length);
        initializer.setDurationModel(durs);
        //        System.out.println("LSVB dur after call: "+JacobUtil.formatMatrix(r));
    }

    public HSegmentation[] segmentTexts(){
        initializer.setDurationModel(m_durs);
        HSegmentation[] segs = initializer.segmentTexts();
        if (debug)
            for (int i = 0; i < D; i++){
                out.println("initial_segs: "+segs[i]);
            }
        FastDCM[] fastdcm = new FastDCM[L];
        
        //initialize Z
        for (int i = 0; i < D; i++){
            for (int l = 0; l < L; l++){
                dpdocs[i][l].setPrior(alphas[l]);
            }
            m_Z[i] = initializeZ(dpdocs[i][0]);
        }

        int ctr = 0;
        //iterate 
        boolean repeated_segmentations = false;
        while (ctr++ < 10 && ! repeated_segmentations){
            printTimeStamp("estimating Z");
            for (int i = 0; i < D; i++){
                //we're only using the counts from dpdocs, so the 1st level is fine
                m_Z[i] = estimateZ(segs[i],m_Z[i],dpdocs[i][0],10000);
            }            
            //update segmentation
            repeated_segmentations = true;
            for (int i = 0; i < D; i++){
                printTimeStamp("segmenting");
                HSegmentation new_seg = segmentTextFromZ(i,m_Z[i]);
                if (! new_seg.equals(segs[i])) repeated_segmentations = false;
                segs[i] = new_seg;
                out.println("hyp: "+segs[i]);
            }
            printTimeStamp("maximizing priors");
            if (em_params) improvePriorsOneIteration(segs);
            if (repeated_segmentations) out.println("terminating due to repeated segmentation");
        }
        return segs;
    }

    protected void showZ(double[][][] Z){
        for (int t = 0; t < Z.length; t++){
            out.println
                (JacobUtil.formatMatrix("%.2e"," ",Z[t]));
        }
    }
    
    protected class SumBlob {
        public SumBlob(double[] cumSum,double[][] cumSums){
            m_cumSum=cumSum;
            m_cumSums =cumSums;
        }
        final double[] cumSum(){ return m_cumSum; }
        final double[][] cumSums(){ return m_cumSums; }
        double[] m_cumSum;
        double[][] m_cumSums;
    }
    

    protected SumBlob getTopLevelSums(DPDocument doc, double[][][] Z){
        int[][] i_cumsums = doc.getCumSums();
        int[] i_cumsum = doc.getCumSum();
        int T = (int) doc.T(); int W = i_cumsums[0].length;
        double[][] cumSums = new double[T+1][W];
        double[] cumSum = new double[T+1];
        int[] i_cumsums_tsub1 = i_cumsums[0];
        for (int t = 1; t < T+1; t++){
            double[][] Z_t = Z[t-1];
            int[] i_cumsums_t = i_cumsums[t];
            int i_cumsum_t = i_cumsum[t];
            int word_ctr = 0;
            for (int w = 0; w < W; w++){
                int count = i_cumsums_t[w] - i_cumsums_tsub1[w];
                double fcount = 0;
                for (int i = 0; i < count; i++){
                    fcount += Z_t[word_ctr++][L];
                }
                cumSums[t][w] = cumSums[t-1][w] + fcount;
                cumSum[t] += fcount;
            }
            cumSum[t] += cumSum[t-1];
            i_cumsums_tsub1 = i_cumsums_t;
        }
        return new SumBlob(cumSum,cumSums);
    }

    //computes the likelihoods of segments from every u to v
    protected SumBlob getSums(DPDocument doc, 
                              double[][][] Z, 
                              int l){
                                      
        int[][] i_cumsums = doc.getCumSums();
        int[] i_cumsum = doc.getCumSum();
        int T = (int) doc.T(); int W = i_cumsums[0].length;
        double[][] cumSums = new double[T+1][W];
        double[] cumSum = new double[T+1];
        int[] i_cumsums_tsub1 = i_cumsums[0];
        for (int t = 1; t < T+1; t++){
            //System.out.println("T"+t+"="+Z[t-1].length);
            double[][] Z_t = Z[t-1];
            int[] i_cumsums_t = i_cumsums[t];
            int i_cumsum_t = i_cumsum[t];
            int word_ctr = 0;
            for (int w = 0; w < W; w++){
                int count = i_cumsums_t[w] - i_cumsums_tsub1[w];
                double fcount = 0;
                for (int i = 0; i < count; i++){
                    fcount += Z_t[word_ctr++][l];
                }
                cumSums[t][w] = cumSums[t-1][w] + fcount;
                cumSum[t] += fcount;
            }
            cumSum[t] += cumSum[t-1];
            i_cumsums_tsub1 = i_cumsums_t;
        }
        return new SumBlob(cumSum,cumSums);
    }
    

    protected float[][] computeSegProbs(DPDocument doc, 
                                        double[][][] Z, 
                                        int l){
        SumBlob blob = getSums(doc,Z,l);
        double[][] cumSums = blob.cumSums();
        double[] cumSum = blob.cumSum();
        int T = (int) doc.T();
        int W = (int) doc.D();
        float[][] B = new float[T+1][T+1];
        double[] counts = new double[W];
        //int[] i_counts = new int[W];
        FastDCM fastdcm = doc.getDCM();
        if (debug) out.println("DCM with prior = "+doc.getPrior());
        for (int u = 0; u < T+1; u++){
            double[] start_counts = cumSums[u];
            double start_sum = cumSum[u];
            for (int v = u+1; v < T+1; v++){
                double[] end_counts = cumSums[v];
                for (int w = 0; w < W; w++){
                    counts[w] = end_counts[w] - start_counts[w];
                }
                //                B[u][v] = (float) fastdcm.logDCM(counts,cumSum[v]-start_sum);
                B[u][v] = (float) fastdcm.logDCM(counts, cumSum[v]-start_sum);
                if (Float.isNaN(B[u][v])){
                    System.out.println(u+" "+v+" is nan");
                    System.exit(0);
                } 
            }
        }
        return B;
    }
    
    //Z: Sents x Words x Levels
    protected HSegmentation segmentTextFromZ(int i, double Z[][][]){
        //this is the table of segment probabilities
        float B[][][] = new float[L][][];
        for (int l = 0; l < L; l++){
            B[l] = computeSegProbs(dpdocs[i][l],Z,l);
        }        
        m_Z[i] = Z;
        return super.segmentText(i,B);
    }


    /**
       maxes Z from the segmentation, using LSVB

       apparently the bound is not guaranteed to tighten monotonically
       the stopping criterion from the paper uses the absolute value

       the action is here to add that document-level layer
       in fact it's easy
    /**
       @param oldZ : T x N_t x L
     **/
    protected double[][][] estimateZ(HSegmentation seg, double[][][] Z, DPDocument doc,
                                    int max_iterations){
        int W = (int)doc.D(); //the number of words
        int T = (int)doc.T();
        //int[] cum_sent_sums = doc.getCumSum();
        int[][] cum_sums = doc.getCumSums();

        int num_levels = L + (top_layer?1:0);

        double[] level_counts = new double[num_levels];
        Arrays.fill(level_counts, beta);
        double[][][] token_counts = new double[num_levels][][]; //L x K_l x W
        double[][] token_count_sums = new double[num_levels][]; //L x K_l
        for (int l = 0; l < num_levels; l++){
            //            alphas[l] = 0;
            List seglevel = null;
            if (l < L)
                seglevel = seg.getLevel(L-l-1);
            else {
                seglevel = new ArrayList();
                seglevel.add((int)doc.T());
            }
            //            System.out.println("seg level "+l+": "+seglevel);
            //dim(token_counts) = L x N(l) x W
            
            token_counts[l] = new double[seglevel.size()][W];
            token_count_sums[l] = new double[seglevel.size()];
            //adding in the priors
            for (int j = 0; j < seglevel.size(); j++){
                Arrays.fill(token_counts[l][j],alphas[l]);
                token_count_sums[l][j]=W*alphas[l];
            }
            //now get those counts
            int seg_start = 0;
            int seg_ctr = 0;
            for (Object o_seg_stop : seglevel){
                int seg_stop = ((Integer)o_seg_stop).intValue();
                //                System.out.println("adding from: "+seg_start+" "+seg_stop);
                for (int t = seg_start; t < seg_stop; t++){
                    int word_ctr = 0;
                    int[] cum_sums_tplus1 = cum_sums[t+1];
                    int[] cum_sums_t = cum_sums[t];
                    double[][] Z_t = Z[t];
                    for (int w = 0; w < W; w++){
                        int num_tokens_of_w = cum_sums_tplus1[w]-cum_sums_t[w];
                        for (int token = 0; token < num_tokens_of_w; token++){
                            double weight = Z_t[word_ctr][l];
                            token_counts[l][seg_ctr][w] += weight;
                            level_counts[l] += weight;
                            token_count_sums[l][seg_ctr] += weight;
                            word_ctr ++;
                        }
                    }
                    assert (word_ctr == Z_t.length);
                }
                seg_ctr++;
                seg_start = seg_stop;
            }
        }

        double old_bound = -Double.MAX_VALUE;
        double bound = computeBound(Z,token_counts,level_counts,gamma);
        if (debug) out.println(String.format("initial bound: %.3f",bound));
        for (int it = 0; it < max_iterations && Math.abs(bound - old_bound) > k_z_eps; it++){
            old_bound = bound; // this is the bound at the beginning of the epoch

            //randomizing this order could be helpful
            for (int t = 0; t < T; t++){
                int[] cum_sums_t = cum_sums[t];
                int[] cum_sums_tplus1 = cum_sums[t+1];
                int word_ctr = 0;
                //go through the vocabulary
                
                int[] segnums = new int[num_levels]; //the segment number, at each level
                for (int l = 0; l < L; l++) segnums[l] = seg.getSegNum(L-l-1,t);
                if (top_layer) segnums[L] = 0;

                for (int w = 0; w < W; w++){
                    for (int i = 0; i < cum_sums_tplus1[w] - cum_sums_t[w]; i++){
                        double total = 0;
                        //System.out.print("OUT: ");
                        for (int l = 0; l < num_levels; l++){
                            //figure out what segment we're in
                            int my_seg = segnums[l]; 
                            double oldZ = Z[t][word_ctr][l];
                            //  System.out.print(String.format("%.2f ",oldZ));
                            //remove the counts from this guy
                            level_counts[l] -= oldZ;
                            token_counts[l][my_seg][w] -= oldZ;
                            token_count_sums[l][my_seg] -= oldZ;
                            
                            //now recompute it
                            Z[t][word_ctr][l] = 0;
                            double log_z = 0;
                            if (use_component_weights) {
                                log_z += Math.log(level_counts[l]); //prior
                                log_z -= Math.log(JacobUtil.sum(level_counts));
                            }
                            log_z += Math.log(token_counts[l][my_seg][w]); //likelihood numerator
                            log_z -= Math.log(token_count_sums[l][my_seg]); //likeli denom
                            //                            System.out.println(Math.exp(log_z));
                            Z[t][word_ctr][l] = (double) Math.exp(log_z);  //unnormalized prob
                            assert (!Double.isNaN(Z[t][word_ctr][l]));
                            total += Z[t][word_ctr][l]; //partition
                        }
                        //                        System.out.print("\nNEW: " );
                        for (int l = 0; l < num_levels; l++) {
                            int my_seg = segnums[l];
                            double newZ = Z[t][word_ctr][l] / total; //normalize
                            //System.out.print(String.format("%.2f ",newZ));
                            Z[t][word_ctr][l] = newZ; 
                            level_counts[l] += newZ;
                            token_counts[l][my_seg][w] += newZ;
                            token_count_sums[l][my_seg] += newZ;
                        }
                        word_ctr++;
                    }
                }
            }
            bound = computeBound(Z,token_counts,level_counts,gamma);
            out.println(String.format("bound(%d)=%.3f, diff=%.3f, levels=%s, sum(token_counts)=%.3f",it,bound,(bound-old_bound),JacobUtil.formatArray("%.3f"," ",level_counts),JacobUtil.sum(token_counts)));
        }
        return Z;
    }
    
    /**
       we're just going to assume a symmetric prior on 
       segment assignment level

       @returns Z : T x N_t x L
    **/
    protected double[][][] initializeZ(DPDocument doc){
        Uniform uniform = new Uniform(engine);
        double[][][] Z = new double[(int)doc.T()][][];
        int prev_cum_sum = 0;
        int num_levels = L + (top_layer?1:0);
        for (int i = 0; i < doc.T(); i++){
            //figure out 
            int n_i = doc.getCumSum()[i+1] - prev_cum_sum;
            prev_cum_sum = doc.getCumSum()[i+1];
            Z[i] = new double[n_i][num_levels];
            for (int j = 0; j < n_i; j++){
                double total = 0;
                for (int l = 0; l < num_levels; l++){ //or L+1
                    //we'd like to sample this from a dirichlet centered on beta
                    //but colt doesn't support that.
                    Z[i][j][l] = beta+uniform.nextDoubleFromTo(0f,1f);
                    total += Z[i][j][l];
                }
                for (int l = 0; l < num_levels; l++){ Z[i][j][l] /= total; }
                assert (Math.abs(JacobUtil.sum(Z[i][j]) - 1f) < .0001);
            }
        }
        return Z;
    }

    protected double computeBound(double[][][] z, 
                                 double[][][] token_counts, 
                                 double[] level_counts,
                                 FastGamma gamma){
        double bound = 0;
        int total_count = 0;
        for (int t = 0; t < z.length; t++){
            for (int i = 0; i < z[t].length; i++){
                for (int l = 0; l < z[t][i].length; l++){
                    double z_til = z[t][i][l];
                    bound -= z_til * Math.log(z_til);
                    total_count++;
                }
            }
        }
        //         System.out.println("log-lik part of bound: "+bound);
        if (use_component_weights)
            bound += Variational.logDirichletNormalizer(level_counts);
        //         System.out.println("level counts part of bound: "+ Variational.logDirichletNormalizer(level_counts,gamma) );
        double old_bound = bound;
        for (int l = 0; l < token_counts.length; l++){
            for (int j = 0; j < token_counts[l].length; j++){
//                 System.out.println
//                     (String.format("normalizer %d %d (sum=%.2f): %.2f",
//                                    l,j,sum(token_counts[l][j]),
//                                    Variational.logDirichletNormalizer(token_counts[l][j])));
                bound += Variational.logDirichletNormalizer(token_counts[l][j]);
            }
        }
//         System.out.println("token counts part of bound: "+(bound-old_bound));
        //the bound also includes the normalizers for the priors, but those are
        //constant so they're left out
        return bound;
    }

    /**
       compute the log-likelihood of the data and segmentation, given the
       logs of the priors.  overrides the parent to factor in the Zs...
       which, shittily, need to be a member variable.

       @param logpriors the logarithms of the DCM parameters alpha
    **/
    public OptimizerStuff computeLLandGradient(double[] logpriors,HSegmentation[] segs){
        double[] priors = new double[logpriors.length];
        for (int l = 0; l < priors.length; l++){
            if (same_alphas)
                priors[l] = Math.exp(logpriors[0]);
            else
                priors[l] = Math.exp(logpriors[l]);
        }
        if (debug) out.println("LSVB computing ll and gradient for "+
                           JacobUtil.formatArray("%.1e"," ",logpriors)+" "+
                               JacobUtil.formatArray("%.1e"," ",priors));
        OptimizerStuff results = new OptimizerStuff(logpriors.length);
        double[] gradients = results.gradients;
        double likelihood = 0;
        FastDigamma digamma = m_digamma; //supposedly this is faster
        for (int i = 0; i < D; i++){ //num documents?
            int W = (int) dpdocs[i][0].D();
            //need special handling for the top layer.
            if (top_layer){
                double alpha = (double) priors[L];
                double W_alpha = W * alpha;
                double digamma_W_alpha = (double) digamma.digamma(W_alpha);
 
                SumBlob blob = getTopLevelSums(dpdocs[i][0],m_Z[i]);
                FastDCM fastdcm = dpdocs[i][0].getDCM(); //doesn't matter which one
                fastdcm.setPrior(alpha);
                for (int w = 0; w < W; w++){
                    gradients[L] -= digamma.digamma(blob.cumSums()[1][w]+alpha);
                }
                float total = (float) blob.cumSum()[1];
                gradients[L] -= W*(digamma_W_alpha - 
                                            digamma.digamma(blob.cumSum()[1]+W_alpha)-
                                            digamma.digamma(alpha));
                likelihood -= fastdcm.logDCM(blob.cumSums()[1]);
                likelihood -= Stats.myLogGammaPdf2(alpha,1,1);
                gradients[L] -= (-1);
            }

            //now the other layers
            for (int l = 0; l < L; l++){
                double alpha = (double) priors[l];
                double W_alpha = W * alpha;
                double digamma_W_alpha = (double) digamma.digamma(W_alpha);
                SumBlob blob = getSums(dpdocs[i][l], m_Z[i], l);
                double[] cumSum = blob.cumSum();
                double[][] cumSums = blob.cumSums();
                FastDCM fastdcm = dpdocs[i][l].getDCM();
                fastdcm.setPrior(alpha);
                List<Integer> segpts = new ArrayList<Integer>();
                segpts = segs[i].getLevel(L-l-1);
                //for (int j = 0; j < segs.length; j++){
                dpdocs[i][l].setPrior(priors[l]);
                int start_pt = 0;
                for (int seg_pt : segpts){
                    //these are subtractions because we are minimizing the Negative LL
                    double[] counts = new double[W];
                    double[] end_counts = cumSums[seg_pt]; //minus one?
                    double[] start_counts = cumSums[start_pt];
                    for (int w = 0; w < W; w++){
                        counts[w] = end_counts[w]-start_counts[w];
                        gradients[l] -= digamma.digamma(counts[w]+alpha);
                    }
                    //                     out.println("counts("+seg_pt+"): "+
                    //                                        JacobUtil.formatArray("%.1f"," ",counts));
                    float total = (float)(cumSum[seg_pt]-cumSum[start_pt]);
                    gradients[l] -= W* (digamma_W_alpha - 
                                        digamma.digamma(total + W_alpha) - 
                                        digamma.digamma(alpha));
                    likelihood -= fastdcm.logDCM(counts);
                    //no need to include this term here, i think
                    //likelihood -= ((seg_pt-start_pt)*Math.log (1-r[i][l])-Math.log(r[i][l]));
                    likelihood -= dm[i][l].logPDur(seg_pt - start_pt); //TODO: plus 1?
                    start_pt = seg_pt;
                }
                //let's just place a Gamma(1,1) prior on this for regularization
                //normally i think people like inverse-gamma but whatever
                likelihood -= Stats.myLogGammaPdf2(alpha,1,1);
                //this just has a gradient of -1 everywhere
                gradients[l] -= (-1);
            }

        }
       
        
        if (same_alphas){
            for (int l = 1; l < gradients.length; l++){
                gradients[0] += gradients[l];
                gradients[l] = 0;
            }
        }
        //this is because the parameter that L-BFGS sees is the log of the prior
        for (int i = 0; i < gradients.length; i++){
            gradients[i] *= priors[i];
        }
        results.likelihood = likelihood;
        results.gradients = gradients;
        if (debug) out.println(" likelihood: "+results.likelihood);
        if (debug) out.println(" gradient: "+JacobUtil.formatArray("%.1e"," ",results.gradients));
        return results;
    }

    static final String K_INITIALIZER_FILENAME = "hconfig/greedy-uni.config";
    //but keep this here
    double beta; //dirichlet prior on segment level assignments
    RandomEngine engine;
    FastDigamma m_digamma;
    HSegmenter initializer;
    int seed;
    static double k_z_eps = 1e-3;
    double[][][][] m_Z;
    boolean use_component_weights;
    List[][] m_durs;
    boolean top_layer;
}
