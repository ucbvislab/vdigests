package edu.mit.nlp.segmenter.hierarchical;

public class OptimizerStuff {
    OptimizerStuff(int nparams){
        gradients = new double[nparams];
        likelihood = 0;
    }
    double likelihood;
    double[] gradients;
}
