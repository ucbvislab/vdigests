package edu.mit.nlp.segmenter.hierarchical;

import edu.mit.nlp.segmenter.SegTesterParams;
import edu.mit.nlp.segmenter.dp.DPDocument;
import edu.mit.nlp.segmenter.dp.I2JInterface;
import edu.mit.util.stats.Stats;
import edu.mit.util.JacobUtil;
import edu.mit.util.weka.LBFGSWrapper; 
import java.io.FileInputStream;
import java.util.Arrays;
import java.util.Properties;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;
import cern.jet.random.Poisson;
import cern.jet.random.engine.RandomEngine;
import cern.jet.random.engine.MersenneTwister;

/**
   Hierarchical segmentation from Bayesian lexical cohesion

   Does a viterbi EM thing where the M-step uses gradient descent
   to figure out the MAP setting of the alpha parameter.

   the same-alphas parameter (set in HBayesSeg) determines whether
   all levels get the same alpha, or each level gets a different one.
**/

public class HBayesSegEM extends HBayesSeg {
    public HBayesSegEM(){super();}
    public void initialize (String config_filename){
        super.initialize(config_filename);
        Properties props = new Properties();
        try {
            props.load(new FileInputStream(config_filename));
            em_params = SegTesterParams.getBoolProp(props,"em-params",true);
        } catch (Exception e){ 
            e.printStackTrace(); 
        }
    }

    /**
       see the paper...
     **/
    public HSegmentation[] segmentTexts(){
        HSegmentation[] segs = null;
        if (em_params){
        //do EM, calling the parent in the E-step.
            double old_ll = Double.MAX_VALUE;
            double improvement = Double.MAX_VALUE;
            segs = null;
            for (int i = 0; i < 20 && improvement > .01; i++){
                segs = super.segmentTexts();
                System.out.println(segs[0]);
                double score = improvePriorsOneIteration(segs);
                improvement = old_ll - score;
                if (debug) out.println(String.format("delta: %.2e, ctr %d, score: %.2e, params: %s",
                                                     improvement,
                                                     i,
                                                 old_ll,
                                                     JacobUtil.formatArray("%.1e"," ",alphas)));
                old_ll = score;
            }
            out.println("Best alphas: "+JacobUtil.formatArray("%.2e"," ",alphas));
        } else {
            segs = super.segmentTexts();
        }
        return segs;
    }

    public double improvePriorsOneIteration(HSegmentation[] segs){
        //update those alpha priors
        PriorOptimizer optimizer = new PriorOptimizer();
        optimizer.m_eps = 1e-5; optimizer.m_num_corrections = 4;
        //        HSegmentation[] segs = super.segmentTexts();
        double[] log_alphas = new double[alphas.length];
        optimizer.setSegs(segs);
        out.println("setting segs: ");
        for (int i = 0; i < segs.length; i++){
            out.println(segs[i]);
        }
        for (int j = 0; j < log_alphas.length; j++){
            log_alphas[j] =  Math.log((double)alphas[j]);
        }
        optimizer.setEstimate(log_alphas);
        optimizer.setMaxIteration(200);
        optimizer.setDebug(debug);
        try {
            log_alphas = optimizer.findArgmin();
        } catch (Exception e){
            e.printStackTrace();
        }
        log_alphas = optimizer.getVarbValues();
        for (int j =0 ;j < log_alphas.length; j++){
            if (same_alphas)
                alphas[j] = (float) Math.exp(log_alphas[0]);
            else
                alphas[j] = (float) Math.exp(log_alphas[j]);
        }
        return optimizer.getMinFunction();
    }
    

    /****************** parameter settings stuff ****************/

    /**
       compute the log-likelihood of the data and segmentation, given the
       logs of the priors

       @param logpriors the logarithms of the DCM parameters alpha
    **/
    public OptimizerStuff computeLLandGradient(double[] logpriors,HSegmentation[] segs){
        double[] priors = new double[logpriors.length];
        for (int l = 0; l < priors.length; l++){
            priors[l] = Math.exp(logpriors[l]);
        }
        if (debug) out.println("computing ll and gradient for "+
                           JacobUtil.formatArray("%.1e"," ",logpriors)+" "+
                           JacobUtil.formatArray("%.1e"," ",priors));

        OptimizerStuff results = new OptimizerStuff(logpriors.length);
        List<Integer> segpts;
        //        for (int l = 0; l < priors.length; l++){
        for (int l = 0; l < priors.length; l++){
            //so basically we have stored dpdocuments for everybody in a big huge
            //array.  go through and set them all and count it.  rack'em and roll'em.
            for (int i = 0; i < segs.length; i++){
                dpdocs[i][l].setPrior(Math.exp(logpriors[l]));
                segpts = segs[i].getLevel(L-l-1);
                int start_pt = 0;
                for (int seg_pt : segpts){
                    //these are subtractions because we are minimizing the Negative LL
                    results.likelihood -= dpdocs[i][l].segLL(start_pt+1,seg_pt);
                    // System.out.println(String.format("%d %d %.1e",start_pt,seg_pt,
//                                                      dpdocs[i].segLL(start_pt+1,seg_pt)));
                    results.gradients[l] -= dpdocs[i][l].segLLGradient(start_pt+1,seg_pt);
                    start_pt = seg_pt;
                    //          System.out.print(seg_pt+" ");
                }
                //System.out.println(dpdocs[i][l].T());
            } 
        }
        
        if (same_alphas){
            for (int l = 1; l < results.gradients.length; l++){
                results.gradients[0] += results.gradients[l];
                results.gradients[l] = 0;
            }
        }

        if (debug) out.println(" likelihood: "+results.likelihood);
        if (debug) out.println(" gradient: "+JacobUtil.formatArray("%.1e"," ",results.gradients));
        return results;
    }

    /** 
        tests the gradient computation by manipulating the 
        priors from -5 to +5 in increments of .2
    **/
    protected void testGradient(HSegmentation[] segs, double[] init_priors){
        double[] cur_priors = new double[init_priors.length];
        for (float adjust = -5; adjust <= 5; adjust += .2){
            cur_priors[0] = init_priors[0];
            for (int i = 0; i < cur_priors.length; i++) cur_priors[i] = init_priors[i] + adjust;
            computeLLandGradient(cur_priors,segs);
        }
    }

    protected int getNumLevels(){ return L; }

    protected class PriorOptimizer extends LBFGSWrapper {
        public PriorOptimizer(){
            super(getNumLevels());
            cur_params = new double[getNumLevels()];
            stuff = null;
        }
        public void setSegs(HSegmentation[] segs){ this.segs = segs; }
        public double objectiveFunction(double[] params){
            if (!checkParams(params)){
                stuff = computeLLandGradient(params,segs);
                for (int i = 0; i < cur_params.length; i++)
                    cur_params[i] = params[i];
            }
            return stuff.likelihood;
            //            return computeLLandGradient(params,segs).likelihood;
        }
        public double[] evaluateGradient(double[] params){
            if (!checkParams(params)){
                stuff = computeLLandGradient(params,segs);
                for (int i = 0; i < cur_params.length; i++)
                    cur_params[i] = params[i];
            }
            return stuff.gradients;
            //            return computeLLandGradient(params,segs).gradients;
        }
        boolean checkParams(double[] params){
            for (int i = 0; i < params.length; i++){
                if (params[i] != cur_params[i]) return false;
            }
            return true;
        }
        HSegmentation[] segs;
        OptimizerStuff stuff;
        double[] cur_params;
    }
    boolean em_params;
}
