---
title: "SimplifyCFG, part 1"
Tags : ["LLVM" , "C++"] 
date: 2025-02-05T16:07:05-05:00
draft: false
hideToc: false
---


## Introduction

Code optimization is one of the most important steps in the compiler's code generation pipeline. Optimization is performed in multiple passes, which are categorized into analysis passes and transformation passes. Analysis passes help the compiler gather information and understand the code structure. Examples of such passes include [dominance tree construction][1] and [alias analysis][2], which provide insights into code. Transformation passes, on the other hand, are responsible for modifying the target program to improve its performance while ensuring correctness. These passes rely on the information obtained from analysis passes to make safe and effective optimizations.

A prominent example of a transformation pass is [SimplifyCFG][3]. This pass is applied repeatedly throughout the optimization pipeline and performs various tasks, including dead code elimination, speculative execution, and eliminate duplicate phi nodes. In fact, it handles so many operations that its source code spans approximately 8,500 lines. Here we will focus on explaining the default actions performed by this pass.

## Let's start

### The SimplifyCFGPass class
The [SimplifyCFG.h][4] file defines the following class:

{{< highlight cpp "linenostart=29" >}}
class SimplifyCFGPass : public PassInfoMixin<SimplifyCFGPass> {
  SimplifyCFGOptions Options;
{{< / highlight >}}

The `SimplifyCFGPass` class inherits from `PassInfoMixin<SimplifyCFGPass>`, which is designed for use with the [New Pass Manager][5]. Additionally, the class contains an attribute named `Options`, which allows us to specify the optimizations we want the pass to perform, in addition to the default ones.

### Invoking the pass
The pass manager invokes the pass by calling its `run` member function, which is defined in [SimplifyCFG.h][4]. This function takes two primary arguments:  

1. A reference to `F`, the [function][10] we want to optimize.  
2. The `AM` ([AnalysisManager][6]), a utility class that helps the pass invoke various analysis passes to gather information about the code.  

In the code snippet, we can see that `AM` is used to call **TargetIRAnalysis** and **AssumptionAnalysis**. While we won’t delve deeply into these passes, it’s worth noting their roles:  

- **TargetIRAnalysis**: This is an LLVM analysis pass that provides target-specific information. The returned `TTI` ([TargetTransformInfo][7]) object exposes APIs for querying such information.  
- **AssumptionAnalysis**: This pass identifies and collects assumptions within the function `F`, enabling the pass to use these `assumptions`([llvm.assume’ Intrinsic][9]) to guide its transformations.  


{{< highlight cpp "hl_lines=1-2 ,linenostart=374" >}}
PreservedAnalyses SimplifyCFGPass::run(Function &F,
                                       FunctionAnalysisManager &AM) {
  auto &TTI = AM.getResult<TargetIRAnalysis>(F);
  Options.AC = &AM.getResult<AssumptionAnalysis>(F);
  DominatorTree *DT = nullptr;

  if (RequireAndPreserveDomTree)
    DT = &AM.getResult<DominatorTreeAnalysis>(F);
  if (!simplifyFunctionCFG(F, TTI, DT, Options))
    return PreservedAnalyses::all();
  PreservedAnalyses PA;
  if (RequireAndPreserveDomTree)
    PA.preserve<DominatorTreeAnalysis>();
  return PA;
}
{{< / highlight >}}

The [dominator tree][1] (`DT`) is initialized as `nullptr`. As previously mentioned, this pass offers a variety of options, one of which is maintaining the dominator tree. This behavior can be controlled using the `simplifycfg-require-and-preserve-domtree` flag. By default, the `RequireAndPreserveDomTree` option returns `false` unless explicitly set to `true`. When this option is not enabled, the `DT` will not be initialized.

{{< highlight cpp "hl_lines=2 ,linenostart=374" >}}

  DominatorTree *DT = nullptr;
  if (RequireAndPreserveDomTree)
    DT = &AM.getResult<DominatorTreeAnalysis>(F);
}
{{< / highlight >}}

We can verify that the `DT` is not initialized using `gdb`.

{{< highlight bash "hl_lines=15-16 ,linenostart=374" >}}

379       if (RequireAndPreserveDomTree)
(gdb) source commandLineOtionsPrettyPrinter.py ####load pretty printer i made :)####
(gdb) p RequireAndPreserveDomTree
$1 = Hidden: Hidden
NumOcurr: 0
Ocurrences: Optional
Formatting: Normal
Misc: None
FullyInitialized: true
last position at args 0
Additional vals 0
Argument name: 0x555556314818 "simplifycfg-require-and-preserve-domtree"
Type of arg<0x0>
Help description 0x5555563147b8 "Temporary development switch used to gradually uplift SimplifyCFG into preserving DomTree,"
(gdb) call RequireAndPreserveDomTree.operator bool() #### call to operator bool() ####
$2 = false 
(gdb) n #### jump line 380 didn't initialize DT ####
381       if (!simplifyFunctionCFG(F, TTI, DT, Options))

}
{{< / highlight >}}

The `RequireAndPreserveDomTree` flag is implemented as a command-line option of type `bool`, allowing us to inspect its value directly in `gdb`. This can be done by invoking the **bool operator** or by observing that the code skips the associated `if` statement during debugging.

Finally, we are ready to invoke the optimizations. The function `simplifyFunctionCFG(F, TTI, DT, Options)` is called to perform the optimizations. It returns a `bool` indicating whether any changes were made. If no changes were made, the pass will preserve all the analysis results.

{{< highlight cpp "hl_lines=2 ,linenostart=374" >}}

  if (!simplifyFunctionCFG(F, TTI, DT, Options))
    return PreservedAnalyses::all();
}
{{< / highlight >}}


Inside the `simplifyFunctionCFG` function, we can identify three primary calls for optimizations. These are the key functions that we will explain in detail:  

1. **`removeUnreachableBlocks`**:  
   This function traverses the control flow graph (CFG) and removes all basic blocks that are unreachable within the graph.  

2. **`tailMergeBlocksWithSimilarFunctionTerminators`**

3. **`iterativelySimplifyCFG`**:  
   This function is closely related to the `SimplifyCFGOptions` class mentioned earlier. It performs the majority of the various optimizations provided by the SimplifyCFG pass. Examples of these optimizations include:  
   - Simplifying `switch` statements.  
   - Deleting dead basic blocks.  
   - Sinking common code.  

{{< highlight cpp "hl_lines=6-9 ,linenostart=374" >}}

static bool simplifyFunctionCFGImpl(Function &F, const TargetTransformInfo &TTI,
                                    DominatorTree *DT,
                                    const SimplifyCFGOptions &Options) {
  DomTreeUpdater DTU(DT, DomTreeUpdater::UpdateStrategy::Eager);
 
  bool EverChanged = removeUnreachableBlocks(F, DT ? &DTU : nullptr);
  EverChanged |=
      tailMergeBlocksWithSimilarFunctionTerminators(F, DT ? &DTU : nullptr);
  EverChanged |= iterativelySimplifyCFG(F, TTI, DT ? &DTU : nullptr, Options);
 
}
{{< / highlight >}}

## removeUnreachableBlocks function

This is the first function called by the pass. The parameters passed to the function are as follows:  

1. A reference to `F`, the [function][10] that we want to optimize.  
2. `DTU` ([DominatorTreeUpdater][12]): This parameter is set to `nullptr` because we do not intend to preserve the dominator tree.  
3. `MSSAU` ([MemorySSAUpdater][13]): This parameter is initialized to its default value, `nullptr`.  


{{< highlight cpp "hl_lines=1-2 4 " >}}

bool llvm::removeUnreachableBlocks(Function &F, domtreeupdater *DTU,
                                   MemorySSAUpdater *MSSAU) {
  SmallPtrSet<BasicBlock *, 16> Reachable;
  bool Changed = markAliveBlocks(F, Reachable, DTU);
 
}
{{< / highlight >}}

{{< highlight bash  >}}

279 bool EverChanged = removeUnreachableBlocks(F, DT ? &DTU : nullptr);
(gdb) s
llvm::removeUnreachableBlocks (F=..., DTU=0x0, MSSAU=0x0) 
## DTU and MSSAU are nullptr 
}
{{< / highlight >}}


The core of this pass lies in the markAliveBlocks function, which receives a [set][15] of [basic blocks][16] named `Reachable`. This function populates the `Reachable` set with the basic blocks that can be reached within the control flow graph.

### Explanation of the `markAliveBlocks` Function
The [`markAliveBlocks`][17] function relies on three key variables:  

1. **`worklist`**: (vector of basic blocks) – Acts like a stack, storing blocks that need to be processed. `SmallVector<BasicBlock*, 128>`.  
2. **`BB`**:  (basic block) – Represents the current basic block being analyzed. `BasicBlock *BB`.  
3. **`Reachable`**: (set of basic blocks) – Keeps track of the blocks that can be reached in the control flow graph (CFG).  


The function traverses the CFG, adding the successors of the current basic block (`BB`) to the `worklist` and marking them as reachable. If a successor is already in the `Reachable` set, it will not be inserted again.  

Apart from flagging reachable blocks, the function also performs checks on each basic block. These checks can modify the CFG by marking certain blocks as unreachable. Below are two scenarios where the CFG can change:  

1. **Storing to a `null` or an undefined memory location** – This can lead to the block being considered unreachable.  
2. **An [`llvm.assume`][9] intrinsic evaluates to `false`** – If an assumption is explicitly marked as `false`, the block becomes unreachable. The following example demonstrates this using the C++ `[[assume]]` attribute:  


### Visualization of How `markAliveBlocks` Works  

Below are three examples demonstrating how the `markAliveBlocks` function operates in different scenarios:  

1. **Example 1: Standard `markAliveBlocks` Execution**  
   - Shows how the function traverses the control flow graph and marks reachable blocks. 
   {{< youtube vQPExywGko0 >}}

2. **Example 2: Marking a Block as Unreachable Due to an Undefined Store**  
   - Demonstrates a case where a block is removed because it stores a value to an undefined memory address.
   {{< youtube f0FJCRDipEo >}}

3. **Example 3: Marking a Block as Unreachable Using `llvm.assume`**  
   - Illustrates how LLVM assumptions (`llvm.assume`) can result in a block being marked as unreachable when an assumption is known to be false.  
   {{< youtube sDA2MHJBsfw >}}



In **examples 2 and 3**, we saw cases where `markAliveBlocks` returns `Changed = true`. This happens when blocks are marked as unreachable due to:  
- Storing to an undefined address.  
- An `llvm.assume` intrinsic evaluating to `false`.  

### Checking for Unreachable Blocks  

Once we have the **reachable set**, the next step is verifying whether all blocks in the function are reachable:  

1. **If all blocks are reachable** (`Reachable.size() == F.size()`), the function simply returns `Changed`.  
2. **If some blocks are unreachable**, the function iterates over all blocks in `F`, checking whether they are in the `Reachable` set using:  
   ```cpp
   Reachable.count(&BB)
   ```
   - If `count == 1`, the block is reachable, and we continue.  
   - If `count == 0`, the block is unreachable and is added to a vector `BlocksToRemove`.  
   - If `DTU` (Dominator Tree Updater) is enabled, it also skips blocks pending deletion.  

#### Removing Dead Blocks  

After iterating through the function:  
- If `BlocksToRemove` is **empty**, the function returns `Changed`.  
- Otherwise, `Changed` is set to `true`, and `DeleteDeadBlocks` is called to eliminate the unreachable blocks.  

{{< highlight cpp "hl_lines=4 10 15 18 21 23" >}}

 bool Changed = markAliveBlocks(F, Reachable, DTU);
 
  // If there are unreachable blocks in the CFG...
  if (Reachable.size() == F.size())
    return Changed;
  
  SmallSetVector<BasicBlock *, 8> BlocksToRemove;
  for (BasicBlock &BB : F) {
    
    if (Reachable.count(&BB))
      continue;
    // Skip already-deleted blocks
    if (DTU && DTU->isBBPendingDeletion(&BB))
      continue;
    BlocksToRemove.insert(&BB);
  }
 
  if (BlocksToRemove.empty())
    return Changed;
 
  Changed = true;
 
  DeleteDeadBlocks(BlocksToRemove.takeVector(), DTU);
 
  return Changed; 
}
{{< / highlight >}}

## Conclusion  

In this discussion, we explored how the **SimplifyCFGPass** is invoked and examined the command-line options class in LLVM. We saw that by default, the dominator tree is not preserved in this pass. However, it can be preserved by enabling the `--simplifycfg-require-and-preserve-domtree` command-line option.  

We then delved into the **removeUnreachableBlocks** function, which starts with the **markAliveBlocks** function. This function identifies reachable basic blocks by traversing the control flow graph (CFG). Any blocks that cannot be reached are flagged for removal. Furthermore, the function accounts for obvious undefined behavior (UB) cases that also make certain blocks unreachable.  

The process continues with **removeUnreachableBlocks**, which compares the number of reachable blocks with the total number of blocks in the function. If any blocks are found to be unreachable, they are collected in a set called `BlocksToRemove`. These unreachable blocks are then removed using the **DeleteDeadBlocks** function.  

In the next part, we will explore the **tailMergeBlocksWithSimilarFunctionTerminators** function and its role in further optimizing the control flow graph.

---
## References
| Reference | Description | Link |
|-----------|------------|------|
| [1] | Dominator | [Dominator](https://en.wikipedia.org/wiki/Dominator_(graph_theory)#Algorithms) |
| [2] | Alias Analysis | [Alias Analysis](https://en.wikipedia.org/wiki/Alias_analysis) |
| [3] | Simplify the CFG | [Simplify the CFG](https://llvm.org/docs/Passes.html#simplifycfg-simplify-the-cfg) |
| [4] | SimplifyCFG.h | [SimplifyCFG.h](https://llvm.org/doxygen/SimplifyCFG_8h_source.html) |
| [5] | New Pass Manager | [New Pass Manager](https://llvm.org/docs/NewPassManager.html) |
| [6] | llvm::AnalysisManager | [llvm::AnalysisManager](https://llvm.org/doxygen/classllvm_1_1AnalysisManager.html) |
| [7] | llvm::TargetTransformInfo | [llvm::TargetTransformInfo](https://llvm.org/doxygen/classllvm_1_1TargetTransformInfo.html) |
| [8] | llvm::AssumptionAnalysis | [llvm::AssumptionAnalysis](https://llvm.org/doxygen/classllvm_1_1AssumptionAnalysis.html) |
| [9] | llvm.assume | [llvm.assume](https://llvm.org/docs/LangRef.html#int-assume) |
| [10] | llvm::Function | [llvm::Function](https://llvm.org/doxygen/classllvm_1_1Function.html) |
| [11] | Remove Unreachable | [Remove Unreachable](https://llvm.org/doxygen/Transforms_2Utils_2Local_8cpp_source.html#l03274) |
| [12] | llvm::DomTreeUpdater | [llvm::DomTreeUpdater](https://llvm.org/doxygen/classllvm_1_1DomTreeUpdater.html) |
| [13] | llvm::MemorySSAUpdater | [llvm::MemorySSAUpdater](https://llvm.org/doxygen/classllvm_1_1MemorySSAUpdater.html) |
| [14] | markAliveBlocks | [markAliveBlocks](https://llvm.org/doxygen/Transforms_2Utils_2Local_8cpp.html#a0af4594038f5cb46e7a4c86713520c95) |
| [15] | llvm::SmallPtrSet | [llvm::SmallPtrSet](https://llvm.org/doxygen/classllvm_1_1SmallPtrSet.html) |
| [16] | BasicBlock | [BasicBlock](https://llvm.org/doxygen/classllvm_1_1BasicBlock.html) |
| [17] | markAliveBlocks | [markAliveBlocks](https://llvm.org/doxygen/Transforms_2Utils_2Local_8cpp_source.html#l03038) |

[1]: https://en.wikipedia.org/wiki/Dominator_(graph_theory)#Algorithms "Dominator"
[2]:https://en.wikipedia.org/wiki/Alias_analysis "Alias Analyis"
[3]: https://llvm.org/docs/Passes.html#simplifycfg-simplify-the-cfg "Simplify the CFG"
[4]: https://llvm.org/doxygen/SimplifyCFG_8h_source.html "SimplifyCFG.h"
[5]: https://llvm.org/docs/NewPassManager.html "New Pass Manager"
[6]: https://llvm.org/doxygen/classllvm_1_1AnalysisManager.html "llvm::AnalysisManager"
[7]: https://llvm.org/doxygen/classllvm_1_1TargetTransformInfo.html "llvm::TargetTransformInfo"
[8]: https://llvm.org/doxygen/classllvm_1_1AssumptionAnalysis.html "llvm::AssumptionAnalysis"
[9]: https://llvm.org/docs/LangRef.html#int-assume "llvm.assume"
[10]: https://llvm.org/doxygen/classllvm_1_1Function.html "llvm::Function"
[11]: https://llvm.org/doxygen/Transforms_2Utils_2Local_8cpp_source.html#l03274 "remove unrechable"
[12]: https://llvm.org/doxygen/classllvm_1_1DomTreeUpdater.html "llvm::DomTreeUpdater"
[13]: https://llvm.org/doxygen/classllvm_1_1MemorySSAUpdater.html "llvm::MemorySSAUpdater"
[14]: https://llvm.org/doxygen/Transforms_2Utils_2Local_8cpp.html#a0af4594038f5cb46e7a4c86713520c95 "markAliveBlocks"
[15]: https://llvm.org/doxygen/classllvm_1_1SmallPtrSet.html "llvm::SmallPtrSet"
[16]: https://llvm.org/doxygen/classllvm_1_1BasicBlock.html "BasicBlock"
[17]: https://llvm.org/doxygen/Transforms_2Utils_2Local_8cpp_source.html#l03038 "markAliveBlocks"
