package edu.mit.nlp.segmenter.duration;

import java.util.List;

public interface DurationModel {
    public double logPDur(int dur);
    public void addDur(int dur);
    public void setDurationModel(List<Integer>[][] durs);
    public void clearDurationModel();
    public float edur(); //expected duration
    public String toString();
}
